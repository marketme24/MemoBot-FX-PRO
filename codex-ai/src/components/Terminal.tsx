import React, { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, X } from "lucide-react";

export const Terminal = () => {
  const [logs, setLogs] = useState<string[]>([
    "MEMOCODEX AI v1.2.0 initialized.",
    "Kernel: 6.5.0-generic-x86_64",
    "Sandbox: Node.js v20.x active.",
    "Ready for execution. Type 'help' for commands."
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim().toLowerCase();
    const args = cmd.split(' ');
    const baseCmd = args[0];

    setLogs(prev => [...prev, `> ${input.trim()}`]);
    setHistory(prev => [input.trim(), ...prev]);
    setHistoryIndex(-1);
    
    // Simulate command execution
    setTimeout(() => {
      switch (baseCmd) {
        case 'clear':
          setLogs([]);
          break;
        case 'help':
          setLogs(prev => [...prev, 
            "Available commands:",
            "  help      - Show this help message",
            "  clear     - Clear the terminal",
            "  ls        - List files in current directory",
            "  whoami    - Show current user",
            "  date      - Show current date",
            "  echo      - Print text to terminal",
            "  status    - Check system status",
            "  build     - Compile current project",
            "  run       - Execute main entry point"
          ]);
          break;
        case 'ls':
          setLogs(prev => [...prev, "main.py  app.ts  styles.css  package.json"]);
          break;
        case 'whoami':
          setLogs(prev => [...prev, "architect@memocodex-ai"]);
          break;
        case 'date':
          setLogs(prev => [...prev, new Date().toString()]);
          break;
        case 'echo':
          setLogs(prev => [...prev, args.slice(1).join(' ')]);
          break;
        case 'status':
          setLogs(prev => [...prev, 
            "System: ONLINE",
            "Neural Link: ACTIVE",
            "Database: CONNECTED",
            "Latency: 24ms"
          ]);
          break;
        case 'build':
          setLogs(prev => [...prev, "Building project...", "Compiling TypeScript...", "Optimizing assets...", "Build SUCCESSFUL."]);
          break;
        case 'run':
          setLogs(prev => [...prev, "Starting execution...", "Output: Hello from MEMOCODEX AI", "Process exited with code 0."]);
          break;
        default:
          setLogs(prev => [...prev, `Command '${baseCmd}' not found. Type 'help' for available commands.`]);
      }
    }, 100);

    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-400">
          <TerminalIcon size={14} />
          <span className="uppercase tracking-widest font-bold">Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-zinc-600 hover:text-zinc-400">
            <X size={14} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
        {logs.map((log, i) => (
          <div key={i} className={log.startsWith('>') ? "text-cyan-400" : "text-zinc-400"}>
            {log}
          </div>
        ))}
      </div>
      <form onSubmit={handleCommand} className="p-2 bg-zinc-900/30 flex items-center gap-2">
        <span className="text-cyan-500">➜</span>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-zinc-200"
          autoFocus
        />
      </form>
    </div>
  );
};
