import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { exec, spawn } from "child_process";

// ============================================================
// PROVIDER-AGNOSTIC AI ENGINE
// Uses the OpenAI-compatible chat/completions format.
// Works with: Groq, HuggingFace, Ollama, OpenRouter, Together,
//             Google Gemini (free), Cohere, LM Studio, vLLM,
//             or ANY endpoint that speaks this protocol.
// ============================================================

interface AIProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_PROVIDERS: Record<string, Omit<AIProviderConfig, "apiKey">> = {
  groq:        { name: "Groq (Free Tier)",       baseUrl: "https://api.groq.com/openai/v1",                    model: "llama-3.3-70b-versatile" },
  huggingface: { name: "HuggingFace (Free)",      baseUrl: "https://api-inference.huggingface.co/v1",           model: "mistralai/Mistral-7B-Instruct-v0.3" },
  ollama:      { name: "Ollama (Local, Free)",     baseUrl: "http://localhost:11434/v1",                         model: "llama3" },
  openrouter:  { name: "OpenRouter (Multi-model)", baseUrl: "https://openrouter.ai/api/v1",                      model: "meta-llama/llama-3.3-70b-instruct:free" },
  together:    { name: "Together AI (Free Tier)",  baseUrl: "https://api.together.xyz/v1",                       model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free" },
  gemini:      { name: "Google Gemini (Free)",     baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  cohere:      { name: "Cohere (Free Tier)",       baseUrl: "https://api.cohere.com/compatibility/v1",           model: "command-r" },
  lmstudio:    { name: "LM Studio (Local)",        baseUrl: "http://localhost:1234/v1",                          model: "local-model" },
  custom:      { name: "Custom Endpoint",          baseUrl: "",                                                  model: "" },
};

let activeProvider: AIProviderConfig = {
  name: DEFAULT_PROVIDERS.groq.name,
  baseUrl: process.env.AI_BASE_URL || DEFAULT_PROVIDERS.groq.baseUrl,
  apiKey: process.env.AI_API_KEY || "",
  model: process.env.AI_MODEL || DEFAULT_PROVIDERS.groq.model,
};

async function callAI(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<{ text: string; error?: string }> {
  if (!activeProvider.baseUrl) {
    return { text: "", error: "No AI provider configured. Go to Settings → AI Engine to set one up." };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (activeProvider.apiKey) {
      headers["Authorization"] = `Bearer ${activeProvider.apiKey}`;
    }

    const res = await fetch(`${activeProvider.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: activeProvider.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { text: "", error: `AI API error (${res.status}): ${errBody}` };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return { text };
  } catch (err) {
    return { text: "", error: `AI request failed: ${String(err)}` };
  }
}

// ============================================================
// LOCAL FILE-BASED STORAGE (No Firebase / No Cloud Lock-in)
// ============================================================

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(PROJECTS_DIR);

interface StoredProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language: string;
  type: "file" | "folder";
  updatedAt: string;
}

interface StoredMessage {
  id: string;
  projectId: string;
  role: "user" | "model" | "system";
  content: string;
  createdAt: string;
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch { /* ignore parse errors */ }
  return fallback;
}

function writeJSON(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function projectMetaPath(projectId: string) { return path.join(PROJECTS_DIR, projectId, "meta.json"); }
function projectFilesPath(projectId: string) { return path.join(PROJECTS_DIR, projectId, "files.json"); }
function projectMessagesPath(projectId: string) { return path.join(PROJECTS_DIR, projectId, "messages.json"); }
function projectWorkdir(projectId: string) { return path.join(PROJECTS_DIR, projectId, "workdir"); }

// Materialize the JSON-stored files into a real directory so a real shell /
// real interpreters can see them. Called on every save/exec.
function materializeProjectFiles(projectId: string) {
  const files = readJSON<StoredFile[]>(projectFilesPath(projectId), []);
  const workdir = projectWorkdir(projectId);
  ensureDir(workdir);
  for (const f of files) {
    if (f.type === "folder") continue;
    // Prevent path traversal — only allow paths inside the workdir.
    const target = path.resolve(workdir, f.path);
    if (!target.startsWith(path.resolve(workdir) + path.sep) && target !== path.resolve(workdir)) continue;
    ensureDir(path.dirname(target));
    fs.writeFileSync(target, f.content);
  }
  return workdir;
}

function getAllProjects(): StoredProject[] {
  ensureDir(PROJECTS_DIR);
  const dirs = fs.readdirSync(PROJECTS_DIR).filter(d => fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory());
  return dirs.map(d => readJSON<StoredProject>(projectMetaPath(d), { id: d, name: d, createdAt: "", updatedAt: "" }));
}

function createDefaultProjectIfEmpty(): string | null {
  const projects = getAllProjects();
  if (projects.length > 0) return null;

  const id = uuidv4();
  const project: StoredProject = { id, name: "Project-Alpha", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  writeJSON(projectMetaPath(id), project);

  const defaultFiles: StoredFile[] = [
    { id: uuidv4(), projectId: id, path: "main.py", content: 'def hello_world():\n    print("Hello from MEMOCODEX AI")\n\nhello_world()', language: "python", type: "file", updatedAt: new Date().toISOString() },
    { id: uuidv4(), projectId: id, path: "README.md", content: "# Project Alpha\n\nCreated by MEMOCODEX AI — open-source coding assistant.", language: "markdown", type: "file", updatedAt: new Date().toISOString() },
  ];
  writeJSON(projectFilesPath(id), defaultFiles);
  writeJSON(projectMessagesPath(id), []);
  return id;
}

// ============================================================
// EXPRESS + SOCKET.IO SERVER
// ============================================================

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: (_origin, cb) => cb(null, true), methods: ["GET", "POST"], credentials: true },
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", provider: activeProvider.name, timestamp: new Date().toISOString() });
  });

  // ---- AI Provider Config ----

  app.get("/api/ai/providers", (_req, res) => {
    res.json({ providers: DEFAULT_PROVIDERS, active: { name: activeProvider.name, baseUrl: activeProvider.baseUrl, model: activeProvider.model, hasKey: !!activeProvider.apiKey } });
  });

  app.post("/api/ai/configure", (req, res) => {
    const { providerKey, baseUrl, apiKey, model } = req.body;
    if (providerKey && DEFAULT_PROVIDERS[providerKey]) {
      const preset = DEFAULT_PROVIDERS[providerKey];
      activeProvider = { name: preset.name, baseUrl: baseUrl || preset.baseUrl, apiKey: apiKey ?? activeProvider.apiKey, model: model || preset.model };
    } else {
      activeProvider = { name: "Custom", baseUrl: baseUrl || activeProvider.baseUrl, apiKey: apiKey ?? activeProvider.apiKey, model: model || activeProvider.model };
    }
    res.json({ success: true, active: { name: activeProvider.name, baseUrl: activeProvider.baseUrl, model: activeProvider.model, hasKey: !!activeProvider.apiKey } });
  });

  // ---- AI Chat Endpoints ----

  app.post("/api/ai/chat", async (req, res) => {
    const { prompt, systemInstruction, mode } = req.body;

    const messages: { role: string; content: string }[] = [];
    if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
    messages.push({ role: "user", content: prompt });

    const temperature = mode === "pro" ? 0.3 : 0.7;
    const result = await callAI(messages, { temperature });
    if (result.error) {
      res.status(500).json({ error: result.error });
    } else {
      res.json({ text: result.text });
    }
  });

  // ---- Project CRUD ----

  app.get("/api/projects", (_req, res) => {
    createDefaultProjectIfEmpty();
    res.json({ projects: getAllProjects() });
  });

  app.post("/api/projects", (req, res) => {
    const { name } = req.body;
    const id = uuidv4();
    const project: StoredProject = { id, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    writeJSON(projectMetaPath(id), project);
    writeJSON(projectFilesPath(id), [{ id: uuidv4(), projectId: id, path: "index.js", content: "// New Project", language: "javascript", type: "file", updatedAt: new Date().toISOString() }]);
    writeJSON(projectMessagesPath(id), []);
    res.json({ project });
  });

  // ---- File CRUD ----

  app.get("/api/projects/:projectId/files", (req, res) => {
    const files = readJSON<StoredFile[]>(projectFilesPath(req.params.projectId), []);
    res.json({ files });
  });

  app.post("/api/projects/:projectId/files", (req, res) => {
    const { path: filePath, content, language, type } = req.body;
    const files = readJSON<StoredFile[]>(projectFilesPath(req.params.projectId), []);
    const newFile: StoredFile = { id: uuidv4(), projectId: req.params.projectId, path: filePath, content: content || "", language: language || "plaintext", type: type || "file", updatedAt: new Date().toISOString() };
    files.push(newFile);
    writeJSON(projectFilesPath(req.params.projectId), files);
    materializeProjectFiles(req.params.projectId);
    io.to(req.params.projectId).emit("file-created", { file: newFile });
    res.json({ file: newFile });
  });

  app.put("/api/projects/:projectId/files/:fileId", (req, res) => {
    const files = readJSON<StoredFile[]>(projectFilesPath(req.params.projectId), []);
    const idx = files.findIndex(f => f.id === req.params.fileId);
    if (idx === -1) return res.status(404).json({ error: "File not found" });
    const { content, path: newPath, language } = req.body;
    files[idx] = { ...files[idx], ...(content !== undefined && { content }), ...(newPath !== undefined && { path: newPath }), ...(language !== undefined && { language }), updatedAt: new Date().toISOString() };
    writeJSON(projectFilesPath(req.params.projectId), files);
    materializeProjectFiles(req.params.projectId);
    io.to(req.params.projectId).emit("file-updated", { fileId: files[idx].id, content: files[idx].content, path: files[idx].path });
    res.json({ file: files[idx] });
  });

  app.delete("/api/projects/:projectId/files/:fileId", (req, res) => {
    let files = readJSON<StoredFile[]>(projectFilesPath(req.params.projectId), []);
    files = files.filter(f => f.id !== req.params.fileId);
    writeJSON(projectFilesPath(req.params.projectId), files);
    io.to(req.params.projectId).emit("file-deleted", { fileId: req.params.fileId });
    res.json({ success: true });
  });

  // ---- Message CRUD ----

  app.get("/api/projects/:projectId/messages", (req, res) => {
    const messages = readJSON<StoredMessage[]>(projectMessagesPath(req.params.projectId), []);
    res.json({ messages });
  });

  app.post("/api/projects/:projectId/messages", (req, res) => {
    const { role, content } = req.body;
    const messages = readJSON<StoredMessage[]>(projectMessagesPath(req.params.projectId), []);
    const msg: StoredMessage = { id: uuidv4(), projectId: req.params.projectId, role, content, createdAt: new Date().toISOString() };
    messages.push(msg);
    writeJSON(projectMessagesPath(req.params.projectId), messages);
    res.json({ message: msg });
  });

  // ---- Sandbox (REAL execution) ----
  // WARNING: This runs arbitrary code on the host. Only run on trusted machines.

  const LANG_RUNNERS: Record<string, { cmd: string; ext: string; args?: (file: string) => string[] }> = {
    javascript: { cmd: "node", ext: "js" },
    typescript: { cmd: "npx", ext: "ts", args: (f) => ["tsx", f] },
    python:     { cmd: "python3", ext: "py" },
    bash:       { cmd: "bash", ext: "sh" },
    sh:         { cmd: "sh", ext: "sh" },
    ruby:       { cmd: "ruby", ext: "rb" },
    go:         { cmd: "go", ext: "go", args: (f) => ["run", f] },
  };

  app.post("/api/sandbox/run", async (req, res) => {
    const { code, language, projectId } = req.body as { code: string; language: string; projectId?: string };
    const runner = LANG_RUNNERS[(language || "").toLowerCase()];
    if (!runner) {
      return res.json({ output: `No runner configured for "${language}". Supported: ${Object.keys(LANG_RUNNERS).join(", ")}` });
    }
    const workdir = projectId ? materializeProjectFiles(projectId) : path.join(DATA_DIR, "scratch");
    ensureDir(workdir);
    const tmpFile = path.join(workdir, `__run_${Date.now()}.${runner.ext}`);
    fs.writeFileSync(tmpFile, code);
    const args = runner.args ? runner.args(tmpFile) : [tmpFile];
    const child = spawn(runner.cmd, args, { cwd: workdir });
    let stdout = "", stderr = "";
    const killer = setTimeout(() => child.kill("SIGKILL"), 15_000);
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      clearTimeout(killer);
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      res.json({ exitCode: code, stdout, stderr, output: (stdout + (stderr ? "\n" + stderr : "")) || `(exit ${code})` });
    });
    child.on("error", (err) => {
      clearTimeout(killer);
      res.json({ exitCode: -1, stdout: "", stderr: String(err), output: `Failed to launch ${runner.cmd}: ${String(err)}` });
    });
  });

  // ---- Real Terminal Exec ----
  // Each session keeps its own cwd on the server.
  const terminalSessions = new Map<string, { cwd: string }>();

  app.post("/api/terminal/exec", (req, res) => {
    const { command, sessionId, projectId } = req.body as { command: string; sessionId: string; projectId?: string };
    if (!command || !sessionId) return res.status(400).json({ error: "command and sessionId are required" });

    let session = terminalSessions.get(sessionId);
    if (!session) {
      const baseCwd = projectId ? materializeProjectFiles(projectId) : path.join(DATA_DIR, "scratch");
      ensureDir(baseCwd);
      session = { cwd: baseCwd };
      terminalSessions.set(sessionId, session);
    } else if (projectId) {
      // Keep workdir fresh with the latest file contents.
      materializeProjectFiles(projectId);
    }

    const trimmed = command.trim();

    // Handle `cd` ourselves so cwd persists across exec calls.
    if (trimmed.startsWith("cd ") || trimmed === "cd") {
      const target = trimmed === "cd" ? session.cwd : trimmed.slice(3).trim();
      const next = path.resolve(session.cwd, target);
      if (!fs.existsSync(next) || !fs.statSync(next).isDirectory()) {
        return res.json({ stdout: "", stderr: `cd: no such directory: ${target}\n`, exitCode: 1, cwd: session.cwd });
      }
      session.cwd = next;
      return res.json({ stdout: "", stderr: "", exitCode: 0, cwd: session.cwd });
    }

    exec(trimmed, { cwd: session.cwd, timeout: 15_000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      res.json({
        stdout: String(stdout || ""),
        stderr: String(stderr || (err && !stdout ? err.message : "")),
        exitCode: err ? (err as NodeJS.ErrnoException).code ?? 1 : 0,
        cwd: session!.cwd,
      });
    });
  });

  // ---- Socket.io for real-time collaboration ----

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-project", (projectId) => {
      socket.join(projectId);
    });

    socket.on("file-change", (data: { projectId: string; fileId: string; content: string }) => {
      socket.to(data.projectId).emit("file-updated", { fileId: data.fileId, content: data.content });
    });

    socket.on("cursor-move", (data: { projectId: string; userId: string; position: unknown }) => {
      socket.to(data.projectId).emit("cursor-moved", { userId: data.userId, position: data.position });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // ---- Vite dev / static prod ----

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => { res.sendFile(path.join(distPath, "index.html")); });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("============================================================");
    console.log("  MEMOCODEX AI v2.0 — Open-Source Code Assistant");
    console.log("============================================================");
    console.log(`  Server:   http://localhost:${PORT}`);
    console.log(`  Provider: ${activeProvider.name}`);
    console.log(`  Model:    ${activeProvider.model}`);
    console.log(`  Storage:  Local (./data/)`);
    console.log("============================================================");
    console.log("");
  });
}

startServer();
