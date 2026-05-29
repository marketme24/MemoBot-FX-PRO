import { Cpu, Settings, Zap, LayoutTemplate, Check, FolderOpen, PlusCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useRef, useEffect } from "react";
import { ViewState } from "../App";
import { Project } from "../lib/useProject";

export const Navbar = ({
  onOpenSettings,
  viewState,
  onToggleView,
  projects,
  currentProject,
  onSwitchProject,
  onCreateProject
}: {
  onOpenSettings: () => void;
  viewState: ViewState;
  onToggleView: (key: keyof ViewState) => void;
  projects: Project[];
  currentProject: Project | null;
  onSwitchProject: (id: string) => void;
  onCreateProject: () => void;
}) => {
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="h-16 border-b border-zinc-800 bg-[#0a0a0a] flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 flex items-center justify-center overflow-hidden rounded-full bg-white/5 p-0.5">
          <Cpu size={28} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-tighter text-white">MEMOCODEX <span className="text-cyan-400">AI</span></h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">System Online</span>
            </div>
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
              <Zap size={10} className="text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Open Source</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" ref={projectMenuRef}>
          <button
            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-300 hover:border-cyan-500/50 transition-all"
          >
            <FolderOpen size={14} className="text-cyan-400" />
            <span className="truncate max-w-[120px]">{currentProject?.name || "Select Project"}</span>
          </button>

          {isProjectMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
              <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Projects</span>
                <button
                  onClick={() => { onCreateProject(); setIsProjectMenuOpen(false); }}
                  className="p-1 hover:text-cyan-400 transition-colors"
                >
                  <PlusCircle size={14} />
                </button>
              </div>
              <div className="p-1 max-h-64 overflow-y-auto">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onSwitchProject(p.id); setIsProjectMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                      currentProject?.id === p.id ? "bg-cyan-500/10 text-cyan-400" : "text-zinc-300 hover:bg-zinc-800 hover:text-cyan-400"
                    )}
                  >
                    <span className="truncate">{p.name}</span>
                    {currentProject?.id === p.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
          <a href="#" className="hover:text-cyan-400 transition-colors">Sandbox</a>
          <a href="#" className="hover:text-cyan-400 transition-colors">Docs</a>
        </div>

        <div className="h-6 w-px bg-zinc-800" />

        <div className="flex items-center gap-2">
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
              className={cn(
                "p-2 rounded-md transition-colors flex items-center gap-2",
                isViewMenuOpen ? "bg-zinc-800 text-cyan-400" : "text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/50"
              )}
            >
              <LayoutTemplate size={18} />
            </button>

            {isViewMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="p-2 border-b border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Toggle Panels</span>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => onToggleView("fileTree")}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-cyan-400 rounded-md transition-colors"
                  >
                    <span>File Tree</span>
                    {viewState.fileTree && <Check size={14} className="text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => onToggleView("editor")}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-cyan-400 rounded-md transition-colors"
                  >
                    <span>Code Editor</span>
                    {viewState.editor && <Check size={14} className="text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => onToggleView("preview")}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-cyan-400 rounded-md transition-colors"
                  >
                    <span>Visualizer</span>
                    {viewState.preview && <Check size={14} className="text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => onToggleView("terminal")}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-cyan-400 rounded-md transition-colors"
                  >
                    <span>Terminal</span>
                    {viewState.terminal && <Check size={14} className="text-cyan-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 text-zinc-500 hover:text-cyan-400 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};
