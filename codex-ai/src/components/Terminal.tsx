import React, { useState, useRef, useEffect, useMemo } from "react";
import { Terminal as TerminalIcon, X } from "lucide-react";

interface TerminalProps {
  projectId?: string;
}

export const Terminal = ({ projectId }: TerminalProps) => {
  const sessionId = useMemo(() => `term_${Math.random().toString(36).slice(2)}`, []);
  const [logs, setLogs] = useState<string[]>([
    "MEMOCODEX AI Terminal — connected to real shell.",
    "Working directory is your project's materialized workdir.",
    "Type 'help' for tips, or any shell command (ls, cat, node, python3, ...)."
  ]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;

    const raw = input.trim();
    setLogs(prev => [...prev, `> ${raw}`]);
    setHistory(prev => [raw, ...prev]);
    setHistoryIndex(-1);
    setInput("");

    if (raw.toLowerCase() === "clear") {
      setLogs([]);
      return;
    }
    if (raw.toLowerCase() === "help") {
      setLogs(prev => [...prev,
        "This is a REAL shell scoped to your project workdir.",
        "  clear  — clear the screen (client-side)",
        "  cd DIR — change working directory (server-side, persistent)",
        "  Anything else is exec'd via /bin/sh with a 15s timeout."
      ]);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: raw, sessionId, projectId }),
      });
      const data = await res.json();
      if (data.cwd) setCwd(data.cwd);
      const out = [data.stdout, data.stderr].filter(Boolean).join("").replace(/\n$/, "");
      if (out) setLogs(prev => [...prev, ...out.split("\n")]);
      if (typeof data.exitCode === "number" && data.exitCode !== 0 && !out) {
        setLogs(prev => [...prev, `(exit ${data.exitCode})`]);
      }
    } catch (err) {
      setLogs(prev => [...prev, `Error: ${String(err)}`]);
    } finally {
      setBusy(false);
    }
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
        {cwd && <span className="text-zinc-500 truncate max-w-[200px]" title={cwd}>{cwd.split("/").slice(-2).join("/")}</span>}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          className="flex-1 bg-transparent border-none outline-none text-zinc-200 disabled:opacity-50"
          autoFocus
        />
        {busy && <span className="text-cyan-500 animate-pulse">…</span>}
      </form>
    </div>
  );
};
