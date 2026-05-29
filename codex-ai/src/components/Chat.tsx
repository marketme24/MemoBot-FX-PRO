import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, Volume2, Brain } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { aiChat, textToSpeech } from "../lib/ai";

interface Message {
  id?: string;
  role: "user" | "model" | "system";
  content: string;
}

export const Chat = ({
  projectId,
  activeFile,
  allFiles,
  onUpdateFile,
  onCreateFile,
  onDeleteFile,
}: {
  projectId?: string;
  activeFile?: { path: string; content: string };
  allFiles?: { id: string; path: string; content: string }[];
  onUpdateFile?: (id: string, content: string) => Promise<void>;
  onCreateFile?: (path: string, content: string, language: string) => Promise<void>;
  onDeleteFile?: (id: string) => Promise<void>;
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Greetings, Architect. I am MEMOCODEX AI — open-source, provider-free. I am online and ready to build. How shall we proceed?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<"flash" | "pro">("flash");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setCurrentTask(null);
      addLocalMessage("system", "Operation cancelled by Architect.");
    }
  };

  // Load messages from server on project change
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      });
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addLocalMessage = (role: "user" | "model" | "system", content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const saveMessage = async (role: "user" | "model" | "system", content: string) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userContent = input;
    setInput("");
    setIsLoading(true);
    setCurrentTask("Analyzing request...");

    abortControllerRef.current = new AbortController();

    addLocalMessage("user", userContent);
    if (projectId) await saveMessage("user", userContent);

    try {
      const projectContext = allFiles
        ? `The project contains the following files:\n${allFiles.map(f => `- ${f.path} (ID: ${f.id})`).join("\n")}\n\nContents of active file (${activeFile?.path}):\n${activeFile?.content}\n\n`
        : "";

      const systemPrompt = mode === "pro"
        ? "You are MEMOCODEX AI, an elite system architect and senior engineer. Help users write, debug, and improve code across ALL programming languages. Be thorough and provide complete code examples."
        : "You are MEMOCODEX AI, a fast and efficient coding assistant. Support every programming language. Be concise and helpful.";

      const fullPrompt = projectContext + userContent;

      setCurrentTask(mode === "pro" ? "Deep reasoning..." : "Processing...");
      const response = await aiChat(fullPrompt, systemPrompt, mode);

      const modelContent = response || "I encountered an error processing your request.";
      addLocalMessage("model", modelContent);
      if (projectId) await saveMessage("model", modelContent);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        const errorMsg = err instanceof Error ? err.message : String(err);
        addLocalMessage("system", `Error: ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
      setCurrentTask(null);
      abortControllerRef.current = null;
    }
  };

  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const handleTTS = async (text: string) => {
    textToSpeech(text);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-zinc-800">
      <div className="p-4 border-bottom border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Neural Link</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setMode("flash")}
              className={cn("px-3 py-1 text-xs rounded-md transition-all", mode === "flash" ? "bg-cyan-500 text-black font-bold" : "text-zinc-500 hover:text-zinc-300")}
            >
              FLASH
            </button>
            <button
              onClick={() => setMode("pro")}
              className={cn("px-3 py-1 text-xs rounded-md transition-all", mode === "pro" ? "bg-purple-500 text-white font-bold" : "text-zinc-500 hover:text-zinc-300")}
            >
              PRO
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === "user" ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-cyan-500/10 text-cyan-100 border border-cyan-500/30"
                  : "bg-zinc-900 text-zinc-300 border border-zinc-800"
              )}>
                {msg.content}
                {msg.role === "model" && (
                  <button
                    onClick={() => handleTTS(msg.content)}
                    className="mt-2 text-zinc-500 hover:text-cyan-400 transition-colors"
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-2">
              <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                <Brain size={12} className="text-cyan-400 animate-pulse" />
                <span>{currentTask || "Synthesizing..."}</span>
              </div>
              <button
                onClick={handleStop}
                className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest px-2 py-1 bg-red-500/10 rounded border border-red-500/20"
              >
                Stop Task
              </button>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs animate-pulse pl-2">
              <div className="w-1 h-1 rounded-full bg-cyan-500 animate-ping" />
              <span>Neural Link Processing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Command the AI..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-all resize-none h-20"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              onClick={startListening}
              className={cn(
                "p-2 transition-colors",
                isListening ? "text-red-500 animate-pulse" : "text-zinc-500 hover:text-cyan-400"
              )}
              title="Voice Command"
            >
              <Mic size={18} />
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
