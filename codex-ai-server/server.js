// server.js - MEMOCODEX AI v2.0 — Open-Source, Provider-Agnostic
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3456;
const WS_PORT = 3457;

app.use(cors());
app.use(express.json());

// ============================================
// PROVIDER-AGNOSTIC AI ENGINE
// Uses the OpenAI-compatible chat/completions format.
// Works with: Groq, HuggingFace, Ollama, OpenRouter,
//             Together, Gemini, Cohere, LM Studio, vLLM,
//             or ANY endpoint that speaks this protocol.
// ============================================

const DEFAULT_PROVIDERS = {
  groq:        { name: 'Groq (Free Tier)',       baseUrl: 'https://api.groq.com/openai/v1',                    model: 'llama-3.3-70b-versatile' },
  huggingface: { name: 'HuggingFace (Free)',      baseUrl: 'https://api-inference.huggingface.co/v1',           model: 'mistralai/Mistral-7B-Instruct-v0.3' },
  ollama:      { name: 'Ollama (Local, Free)',     baseUrl: 'http://localhost:11434/v1',                         model: 'llama3' },
  openrouter:  { name: 'OpenRouter (Multi-model)', baseUrl: 'https://openrouter.ai/api/v1',                      model: 'meta-llama/llama-3.3-70b-instruct:free' },
  together:    { name: 'Together AI (Free Tier)',  baseUrl: 'https://api.together.xyz/v1',                       model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free' },
  gemini:      { name: 'Google Gemini (Free)',     baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  cohere:      { name: 'Cohere (Free Tier)',       baseUrl: 'https://api.cohere.com/compatibility/v1',           model: 'command-r' },
  lmstudio:    { name: 'LM Studio (Local)',        baseUrl: 'http://localhost:1234/v1',                          model: 'local-model' },
  custom:      { name: 'Custom Endpoint',          baseUrl: '',                                                  model: '' },
};

let activeProvider = {
  name: DEFAULT_PROVIDERS.groq.name,
  baseUrl: process.env.AI_BASE_URL || DEFAULT_PROVIDERS.groq.baseUrl,
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || DEFAULT_PROVIDERS.groq.model,
};

async function callAI(messages, options = {}) {
  if (!activeProvider.baseUrl) {
    return { text: '', error: 'No AI provider configured.' };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (activeProvider.apiKey) {
      headers['Authorization'] = `Bearer ${activeProvider.apiKey}`;
    }

    const res = await fetch(`${activeProvider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: activeProvider.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { text: '', error: `AI API error (${res.status}): ${errBody}` };
    }

    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content || '' };
  } catch (err) {
    return { text: '', error: `AI request failed: ${String(err)}` };
  }
}

// ============================================
// PROJECT MANAGEMENT (Local File System)
// ============================================

const PROJECTS_DIR = path.join(__dirname, 'projects');
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);

let currentProject = 'memobot-fx-pro';
let clients = new Map();

function loadProjects() {
  return fs.readdirSync(PROJECTS_DIR).filter(f =>
    fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory()
  );
}

function getProjectPath(projectName = currentProject) {
  return path.join(PROJECTS_DIR, projectName);
}

function ensureProject(projectName) {
  const projectPath = getProjectPath(projectName);
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }
  return projectPath;
}

// ============================================
// AGENTIC AI ENGINE (Tool Use)
// ============================================

const tools = {
  create_file: {
    description: 'Create a new file with content',
    execute: (params) => {
      const { path: filePath, content } = params;
      const fullPath = path.join(getProjectPath(), filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content);
      return { success: true, message: `Created ${filePath}` };
    }
  },
  edit_file: {
    description: 'Edit an existing file',
    execute: (params) => {
      const { path: filePath, content } = params;
      const fullPath = path.join(getProjectPath(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, content);
        return { success: true, message: `Edited ${filePath}` };
      }
      return { success: false, error: 'File not found' };
    }
  },
  delete_file: {
    description: 'Delete a file',
    execute: (params) => {
      const { path: filePath } = params;
      const fullPath = path.join(getProjectPath(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return { success: true, message: `Deleted ${filePath}` };
      }
      return { success: false, error: 'File not found' };
    }
  },
  list_files: {
    description: 'List files in a directory',
    execute: (params) => {
      const { directory = '' } = params;
      const fullPath = path.join(getProjectPath(), directory);
      if (fs.existsSync(fullPath)) {
        return { success: true, files: fs.readdirSync(fullPath) };
      }
      return { success: false, error: 'Directory not found' };
    }
  },
  read_file: {
    description: "Read a file's content",
    execute: (params) => {
      const { path: filePath } = params;
      const fullPath = path.join(getProjectPath(), filePath);
      if (fs.existsSync(fullPath)) {
        return { success: true, content: fs.readFileSync(fullPath, 'utf-8') };
      }
      return { success: false, error: 'File not found' };
    }
  },
  execute_command: {
    description: 'Execute a shell command',
    execute: async (params) => {
      const { command } = params;
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec(command, { cwd: getProjectPath() }, (error, stdout, stderr) => {
          resolve({ success: !error, output: stdout, error: stderr || error?.message });
        });
      });
    }
  }
};

async function agenticAI(prompt, mode = 'flash') {
  const toolPatterns = [
    { pattern: /create (a|new) file/i, tool: 'create_file' },
    { pattern: /make (a|new) file/i, tool: 'create_file' },
    { pattern: /edit (the|) file/i, tool: 'edit_file' },
    { pattern: /change (the|) file/i, tool: 'edit_file' },
    { pattern: /delete (the|) file/i, tool: 'delete_file' },
    { pattern: /remove (the|) file/i, tool: 'delete_file' },
    { pattern: /list files/i, tool: 'list_files' },
    { pattern: /show me (the|) files/i, tool: 'list_files' },
    { pattern: /read (the|) file/i, tool: 'read_file' },
    { pattern: /run (the|) command/i, tool: 'execute_command' },
    { pattern: /execute (the|) command/i, tool: 'execute_command' }
  ];

  for (const { pattern, tool } of toolPatterns) {
    if (pattern.test(prompt)) {
      let params = {};

      if (tool === 'create_file' || tool === 'edit_file') {
        const fileMatch = prompt.match(/(?:file|named)\s+['"`]?(\w+\.\w+)['"`]?/i);
        if (fileMatch) params.path = fileMatch[1];
        const contentMatch = prompt.match(/with\s+content\s+['"`]?([^'"`]+)['"`]?/i);
        if (contentMatch) params.content = contentMatch[1];
        else params.content = `// Generated by MEMOCODEX AI\n// Request: ${prompt}\n\n`;
      }

      if (tool === 'delete_file') {
        const fileMatch = prompt.match(/(?:file|named)\s+['"`]?(\w+\.\w+)['"`]?/i);
        if (fileMatch) params.path = fileMatch[1];
      }

      if (tool === 'list_files') {
        const dirMatch = prompt.match(/(?:directory|folder)\s+['"`]?(\w+)['"`]?/i);
        if (dirMatch) params.directory = dirMatch[1];
      }

      if (tool === 'execute_command') {
        const cmdMatch = prompt.match(/command\s+['"`]?([^'"`]+)['"`]?/i);
        if (cmdMatch) params.command = cmdMatch[1];
      }

      const result = await tools[tool].execute(params);
      return {
        type: 'tool_execution',
        tool: tool,
        result: result,
        response: result.success
          ? `Done: ${result.message || 'Operation completed'}`
          : `Failed: ${result.error}`
      };
    }
  }

  // Use the provider-agnostic AI engine
  const messages = [
    { role: 'system', content: `You are MEMOCODEX AI, an expert coding assistant supporting ALL programming languages. Be concise, helpful, and provide code examples when relevant. Current project: ${currentProject}` },
    { role: 'user', content: prompt }
  ];

  const result = await callAI(messages, { temperature: mode === 'pro' ? 0.3 : 0.7 });

  if (result.error) {
    return fallbackResponse(prompt);
  }

  return { type: 'ai_response', response: result.text };
}

function fallbackResponse(prompt) {
  if (prompt.toLowerCase().includes('hello') || prompt.toLowerCase().includes('hi')) {
    return {
      type: 'ai_response',
      response: `Hello Architect! I'm MEMOCODEX AI (Open-Source). I can help you with:\n- Creating/editing files\n- Running commands\n- Analyzing code in ANY language\n- Answering questions\n\nWhat would you like me to do?`
    };
  }

  if (prompt.toLowerCase().includes('help')) {
    return {
      type: 'ai_response',
      response: `MEMOCODEX AI Commands:\n\nFILE OPERATIONS:\n  - "Create a file named app.js with content..."\n  - "Edit the file server.js"\n  - "Delete the file temp.txt"\n  - "List files in src directory"\n  - "Read the file package.json"\n\nCOMMAND EXECUTION:\n  - "Run the command npm install"\n  - "Execute npm run build"\n\nAI MODES:\n  - "Switch to PRO mode" (Deep reasoning)\n  - "Switch to FLASH mode" (Fast responses)\n\nGeneral:\n  - "Analyze this code"\n  - "Explain what this does"\n  - "Fix the errors in this file"`
    };
  }

  return {
    type: 'ai_response',
    response: `I understand you want to: ${prompt}\n\nTo help you better, please be more specific. For example:\n- "Create a file named api.js"\n- "Run npm install"\n- "List all files"\n\nType "help" for all available commands.`
  };
}

// ============================================
// WEBSOCKET SERVER
// ============================================

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  clients.set(userId, ws);
  console.log(`[WS] Client connected: ${userId} (Total: ${clients.size})`);

  ws.send(JSON.stringify({
    type: 'connected',
    userId: userId,
    message: 'Neural Link Active — Open Source Edition',
    projects: loadProjects(),
    currentProject: currentProject,
    provider: activeProvider.name,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'chat') {
        const response = await agenticAI(data.prompt, data.mode || 'flash');
        ws.send(JSON.stringify({
          type: 'response',
          originalPrompt: data.prompt,
          ...response,
          timestamp: new Date().toISOString()
        }));
      }

      if (data.type === 'switch_project') {
        const projectPath = path.join(PROJECTS_DIR, data.project);
        if (fs.existsSync(projectPath)) {
          currentProject = data.project;
          ws.send(JSON.stringify({ type: 'project_switched', project: currentProject, timestamp: new Date().toISOString() }));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: `Project ${data.project} not found`, timestamp: new Date().toISOString() }));
        }
      }

      if (data.type === 'create_project') {
        const projectPath = path.join(PROJECTS_DIR, data.project);
        if (!fs.existsSync(projectPath)) {
          fs.mkdirSync(projectPath, { recursive: true });
          ws.send(JSON.stringify({ type: 'project_created', project: data.project, projects: loadProjects(), timestamp: new Date().toISOString() }));
        }
      }

      if (data.type === 'get_status') {
        ws.send(JSON.stringify({
          type: 'status',
          ai: `${activeProvider.name} (${activeProvider.model})`,
          projects: loadProjects(),
          currentProject: currentProject,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }));
      }

      if (data.type === 'configure_provider') {
        const { providerKey, baseUrl, apiKey, model } = data;
        if (providerKey && DEFAULT_PROVIDERS[providerKey]) {
          const preset = DEFAULT_PROVIDERS[providerKey];
          activeProvider = { name: preset.name, baseUrl: baseUrl || preset.baseUrl, apiKey: apiKey || activeProvider.apiKey, model: model || preset.model };
        } else if (baseUrl) {
          activeProvider = { name: 'Custom', baseUrl, apiKey: apiKey || activeProvider.apiKey, model: model || activeProvider.model };
        }
        ws.send(JSON.stringify({ type: 'provider_configured', provider: activeProvider.name, model: activeProvider.model, timestamp: new Date().toISOString() }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message, timestamp: new Date().toISOString() }));
    }
  });

  ws.on('close', () => {
    clients.delete(userId);
    console.log(`[WS] Client disconnected: ${userId} (Remaining: ${clients.size})`);
  });
});

// ============================================
// REST API ENDPOINTS
// ============================================

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    ai: `${activeProvider.name} (${activeProvider.model})`,
    provider: activeProvider.name,
    projects: loadProjects(),
    currentProject: currentProject,
    connectedClients: clients.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/providers', (req, res) => {
  res.json({ providers: DEFAULT_PROVIDERS, active: { name: activeProvider.name, baseUrl: activeProvider.baseUrl, model: activeProvider.model, hasKey: !!activeProvider.apiKey } });
});

app.post('/api/configure', (req, res) => {
  const { providerKey, baseUrl, apiKey, model } = req.body;
  if (providerKey && DEFAULT_PROVIDERS[providerKey]) {
    const preset = DEFAULT_PROVIDERS[providerKey];
    activeProvider = { name: preset.name, baseUrl: baseUrl || preset.baseUrl, apiKey: apiKey || activeProvider.apiKey, model: model || preset.model };
  } else if (baseUrl) {
    activeProvider = { name: 'Custom', baseUrl, apiKey: apiKey || activeProvider.apiKey, model: model || activeProvider.model };
  }
  res.json({ success: true, provider: activeProvider.name, model: activeProvider.model });
});

app.get('/api/projects', (req, res) => {
  res.json({ projects: loadProjects(), current: currentProject });
});

app.post('/api/projects/create', (req, res) => {
  const { name } = req.body;
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
    res.json({ success: true, project: name });
  } else {
    res.json({ success: false, error: 'Project already exists' });
  }
});

app.post('/api/projects/switch', (req, res) => {
  const { name } = req.body;
  const projectPath = path.join(PROJECTS_DIR, name);
  if (fs.existsSync(projectPath)) {
    currentProject = name;
    res.json({ success: true, project: currentProject });
  } else {
    res.json({ success: false, error: 'Project not found' });
  }
});

app.get('/api/files', (req, res) => {
  const { path: filePath = '' } = req.query;
  const fullPath = path.join(getProjectPath(), filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      res.json({ success: true, files: fs.readdirSync(fullPath), isDirectory: true });
    } else {
      res.json({ success: true, content: fs.readFileSync(fullPath, 'utf-8'), isDirectory: false });
    }
  } else {
    res.json({ success: false, error: 'Path not found' });
  }
});

app.post('/api/files/save', (req, res) => {
  const { path: filePath, content } = req.body;
  const fullPath = path.join(getProjectPath(), filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
  res.json({ success: true });
});

app.post('/api/voice/process', async (req, res) => {
  const { text } = req.body;
  const response = await agenticAI(text, 'flash');
  res.json({ response: response.response });
});

// ============================================
// SERVE UI
// ============================================

const uiDir = path.join(__dirname, 'public');
if (!fs.existsSync(uiDir)) fs.mkdirSync(uiDir);

const uiHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MEMOCODEX AI — Open-Source Code Assistant</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0f;
      color: #00ffcc;
      font-family: 'Courier New', monospace;
      height: 100vh;
      overflow: hidden;
    }
    .app { display: flex; height: 100vh; }
    .sidebar {
      width: 280px;
      background: rgba(13, 13, 18, 0.95);
      border-right: 1px solid #00ffcc33;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
    }
    .sidebar-header { padding: 20px; border-bottom: 1px solid #00ffcc33; }
    .logo { font-size: 24px; font-weight: bold; color: #ff3366; }
    .logo span { color: #00ffcc; }
    .projects-list { flex: 1; padding: 20px; overflow-y: auto; }
    .project-item { padding: 10px; margin: 5px 0; background: rgba(255,255,255,0.05); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
    .project-item:hover, .project-item.active { background: #ff336622; border-left: 3px solid #ff3366; }
    .new-project-btn { margin: 20px; padding: 10px; background: #ff3366; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; }
    .main { flex: 1; display: flex; flex-direction: column; }
    .toolbar { background: rgba(13, 13, 18, 0.95); border-bottom: 1px solid #00ffcc33; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; }
    .mode-switch { display: flex; gap: 10px; }
    .mode-btn { padding: 5px 15px; background: transparent; border: 1px solid #00ffcc33; color: #00ffcc; border-radius: 20px; cursor: pointer; }
    .mode-btn.active { background: #00ffcc; color: #0a0a0f; }
    .chat-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
    .message { padding: 12px 16px; border-radius: 12px; max-width: 80%; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .user-message { background: #ff336622; border-left: 3px solid #ff3366; align-self: flex-end; color: white; }
    .ai-message { background: #1a1a2e; border-left: 3px solid #00ffcc; align-self: flex-start; color: #00ffcc; }
    .tool-message { background: #2a1a3e; border-left: 3px solid #ffcc00; align-self: center; color: #ffcc00; font-size: 12px; max-width: 90%; }
    .input-area { background: rgba(13, 13, 18, 0.95); border-top: 1px solid #00ffcc33; padding: 20px; display: flex; gap: 10px; }
    input { flex: 1; background: #1a1a2e; border: 1px solid #00ffcc33; color: #00ffcc; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px; }
    input:focus { outline: none; border-color: #00ffcc; }
    button { padding: 12px 24px; background: #ff3366; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
    button:hover { transform: scale(1.02); background: #ff5588; }
    .voice-btn { background: #00ffcc; color: #0a0a0f; }
    .status-led { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #00ffcc; animation: pulse 2s infinite; margin-right: 8px; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: #00ffcc22; color: #00ffcc; border: 1px solid #00ffcc33; }
  </style>
</head>
<body>
<div class="app">
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="logo">MEMO<span>CODEX</span> AI</div>
      <div style="font-size: 10px; margin-top: 5px;">Open-Source Code Assistant v2.0</div>
      <div style="margin-top: 8px;"><span class="badge">Provider-Free</span> <span class="badge">All Languages</span></div>
    </div>
    <div class="projects-list">
      <div style="margin-bottom: 10px; font-size: 11px; color: #888;">PROJECTS</div>
      <div id="projectsContainer"></div>
    </div>
    <button class="new-project-btn" onclick="createNewProject()">+ NEW PROJECT</button>
    <div style="padding: 20px; border-top: 1px solid #00ffcc33;">
      <div><span class="status-led"></span> <span id="aiStatus">AI READY</span></div>
      <div style="font-size: 10px; color: #888; margin-top: 5px;" id="providerInfo"></div>
    </div>
  </div>

  <div class="main">
    <div class="toolbar">
      <div>MEMOCODEX AI <span id="currentProjectLabel">memobot-fx-pro</span></div>
      <div class="mode-switch">
        <button class="mode-btn" data-mode="flash" onclick="setMode('flash')">FLASH</button>
        <button class="mode-btn active" data-mode="pro" onclick="setMode('pro')">PRO</button>
      </div>
    </div>

    <div class="chat-area" id="chatArea">
      <div class="message ai-message">
        <strong>MEMOCODEX AI v2.0 — Open Source</strong><br><br>
        I am your Agentic AI Code Assistant.<br>
        Zero vendor lock-in. Supports ALL programming languages.<br><br>
        <strong>Features:</strong><br>
        - Create, edit, delete files<br>
        - Execute commands<br>
        - Voice control<br>
        - Multi-project support<br>
        - Works with ANY free AI provider<br><br>
        Type <strong>"help"</strong> to see all commands.
      </div>
    </div>

    <div class="input-area">
      <input type="text" id="promptInput" placeholder="Ask me to create files, run commands, or answer questions..." autofocus>
      <button id="voiceBtn" class="voice-btn">MIC</button>
      <button id="sendBtn">SEND</button>
    </div>
  </div>
</div>

<script>
  let ws = null;
  let currentMode = 'pro';

  function connectWebSocket() {
    ws = new WebSocket('ws://localhost:${WS_PORT}');

    ws.onopen = () => {
      addMessage('Neural Link Connected — Open Source Edition', 'tool');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        loadProjects(data.projects, data.currentProject);
        if (data.provider) document.getElementById('providerInfo').innerText = data.provider;
      }

      if (data.type === 'response') {
        addMessage(data.response, data.type === 'tool_execution' ? 'tool' : 'ai');
      }

      if (data.type === 'project_switched') {
        document.getElementById('currentProjectLabel').innerText = data.project;
        addMessage('Switched to project: ' + data.project, 'tool');
      }

      if (data.type === 'project_created') {
        loadProjects(data.projects, data.project);
        addMessage('Project created: ' + data.project, 'tool');
      }

      if (data.type === 'status') {
        document.getElementById('aiStatus').innerHTML = data.ai;
      }

      if (data.type === 'provider_configured') {
        document.getElementById('providerInfo').innerText = data.provider + ' (' + data.model + ')';
        addMessage('Provider configured: ' + data.provider, 'tool');
      }
    };

    ws.onclose = () => {
      addMessage('Neural Link Disconnected. Reconnecting...', 'tool');
      setTimeout(connectWebSocket, 3000);
    };
  }

  function loadProjects(projects, current) {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = projects.map(p =>
      '<div class="project-item ' + (p === current ? 'active' : '') + '" onclick="switchProject(\\'' + p + '\\')">' + p + '</div>'
    ).join('');
    document.getElementById('currentProjectLabel').innerText = current;
  }

  function switchProject(project) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'switch_project', project }));
    }
  }

  function createNewProject() {
    const name = prompt('Enter project name:');
    if (name && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'create_project', project: name }));
    }
  }

  function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) btn.classList.add('active');
    });
    addMessage('Switched to ' + mode.toUpperCase() + ' mode', 'tool');
  }

  function addMessage(text, type) {
    const chatArea = document.getElementById('chatArea');
    const div = document.createElement('div');
    div.className = 'message ' + (type === 'user' ? 'user-message' : (type === 'tool' ? 'tool-message' : 'ai-message'));
    div.innerHTML = text.replace(/\\n/g, '<br>');
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function sendMessage() {
    const input = document.getElementById('promptInput');
    const prompt = input.value.trim();
    if (!prompt || !ws || ws.readyState !== WebSocket.OPEN) return;

    addMessage(prompt, 'user');
    input.value = '';
    ws.send(JSON.stringify({ type: 'chat', prompt: prompt, mode: currentMode }));
  }

  // Voice Recognition
  let recognition = null;
  function initVoice() {
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        document.getElementById('promptInput').value = event.results[0][0].transcript;
        sendMessage();
      };
    }
  }

  document.getElementById('sendBtn').onclick = sendMessage;
  document.getElementById('promptInput').onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
  document.getElementById('voiceBtn').onclick = () => { if (recognition) recognition.start(); else alert('Voice recognition not supported'); };

  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'get_status' }));
    }
  }, 30000);

  initVoice();
  connectWebSocket();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(uiDir, 'index.html'), uiHTML);
app.use(express.static(uiDir));

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('============================================================');
  console.log('  MEMOCODEX AI v2.0 — Open-Source Code Assistant');
  console.log('============================================================');
  console.log(`  Web UI:    http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${WS_PORT}`);
  console.log(`  Provider:  ${activeProvider.name}`);
  console.log(`  Model:     ${activeProvider.model}`);
  console.log(`  Storage:   Local (./projects/)`);
  console.log('');
  console.log('  Supported: Groq, HuggingFace, Ollama, OpenRouter,');
  console.log('             Together, Gemini, Cohere, LM Studio, Custom');
  console.log('============================================================');
  console.log('');
});

ensureProject('memobot-fx-pro');
