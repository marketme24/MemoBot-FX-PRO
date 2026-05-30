import { useState, useMemo } from "react";
import { Play, Globe, Eye } from "lucide-react";

interface PreviewProps {
  activeFile?: { path: string; content: string; language: string };
  allFiles?: { path: string; content: string }[];
  projectId?: string;
}

export const Preview = ({ activeFile, allFiles, projectId }: PreviewProps) => {
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // For HTML files, build a self-contained srcDoc that inlines sibling CSS/JS.
  const htmlSrcDoc = useMemo(() => {
    if (!activeFile) return null;
    const ext = activeFile.path.split(".").pop()?.toLowerCase();
    if (ext !== "html" && ext !== "htm") return null;

    let html = activeFile.content;
    const findFile = (rel: string) => allFiles?.find(f => f.path === rel || f.path.endsWith("/" + rel));

    // Inline <link rel="stylesheet" href="..."> for local files
    html = html.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (m, href) => {
      if (/^https?:/i.test(href)) return m;
      const f = findFile(href);
      return f ? `<style>${f.content}</style>` : m;
    });
    // Inline <script src="..."> for local files
    html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (m, src) => {
      if (/^https?:/i.test(src)) return m;
      const f = findFile(src);
      return f ? `<script>${f.content}<\/script>` : m;
    });
    return html;
  }, [activeFile, allFiles]);

  const runnableLang = useMemo(() => {
    if (!activeFile) return null;
    const map: Record<string, string> = {
      js: "javascript", ts: "typescript", py: "python", python: "python",
      rb: "ruby", sh: "bash", go: "go",
    };
    const ext = activeFile.path.split(".").pop()?.toLowerCase() || "";
    return map[ext] || (["javascript", "typescript", "python", "ruby", "bash", "go"].includes(activeFile.language) ? activeFile.language : null);
  }, [activeFile]);

  const handleRun = async () => {
    if (!activeFile || !runnableLang) return;
    setRunning(true);
    setRunOutput("Running...");
    try {
      const res = await fetch("/api/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeFile.content, language: runnableLang, projectId }),
      });
      const data = await res.json();
      setRunOutput(data.output || `(exit ${data.exitCode})`);
    } catch (err) {
      setRunOutput(`Error: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 border-b border-zinc-200">
        <div className="flex items-center gap-2 text-zinc-600">
          <Globe size={14} />
          <span className="text-xs font-bold uppercase tracking-widest">Live Preview</span>
          {activeFile && <span className="text-[10px] font-mono text-zinc-500">{activeFile.path}</span>}
        </div>
        <div className="flex items-center gap-2">
          {runnableLang && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1 px-2 py-1 bg-cyan-500 text-white rounded text-[10px] font-bold hover:bg-cyan-600 disabled:opacity-50"
            >
              <Play size={12} />
              {running ? "RUNNING…" : `RUN ${runnableLang.toUpperCase()}`}
            </button>
          )}
        </div>
      </div>

      {htmlSrcDoc ? (
        <iframe
          title="preview"
          srcDoc={htmlSrcDoc}
          sandbox="allow-scripts"
          className="flex-1 w-full bg-white"
        />
      ) : runOutput !== null ? (
        <pre className="flex-1 overflow-auto bg-zinc-900 text-zinc-100 p-3 text-xs font-mono whitespace-pre-wrap">{runOutput}</pre>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-zinc-50 text-zinc-400 italic text-sm">
          <div className="text-center">
            <Eye size={32} className="mx-auto mb-2 opacity-20" />
            <p>{activeFile ? "Select an HTML file or click RUN to execute" : "No file selected"}</p>
            <p className="text-xs mt-1">HTML → live render • JS/TS/Python/Ruby/Bash/Go → real exec</p>
          </div>
        </div>
      )}
    </div>
  );
};
