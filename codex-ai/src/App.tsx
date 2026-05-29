/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Navbar } from "./components/Navbar";
import { FileTree } from "./components/FileTree";
import { CodeEditor } from "./components/CodeEditor";
import { Chat } from "./components/Chat";
import { Terminal } from "./components/Terminal";
import { Preview } from "./components/Preview";
import { SettingsModal } from "./components/SettingsModal";
import { Analytics } from "./components/Analytics";
import { cn } from "./lib/utils";
import { Zap } from "lucide-react";
import { useProject, FileNode } from "./lib/useProject";

const ResizeHandle = ({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) => (
  <PanelResizeHandle className={cn(
    "flex items-center justify-center bg-zinc-900 transition-colors hover:bg-cyan-500/50 active:bg-cyan-500",
    direction === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"
  )}>
    <div className={cn("bg-zinc-700 rounded-full", direction === "horizontal" ? "w-0.5 h-8" : "h-0.5 w-8")} />
  </PanelResizeHandle>
);

export type ViewState = {
  fileTree: boolean;
  editor: boolean;
  preview: boolean;
  terminal: boolean;
};

export default function App() {
  const {
    project,
    projects,
    files,
    loading,
    updateFileContent,
    createFile,
    deleteFile,
    createProject,
    switchProject
  } = useProject();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({
    fileTree: true,
    editor: true,
    preview: true,
    terminal: true,
  });

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0) {
      const firstFile = files.find(f => f.type === "file");
      if (firstFile) setSelectedFileId(firstFile.id);
    } else {
      setSelectedFileId(null);
    }
  }, [files]);

  const selectedFile = files.find(f => f.id === selectedFileId);

  const handleCreateFile = () => {
    const name = window.prompt("Enter file name (e.g. script.js):");
    if (name) {
      const ext = name.split(".").pop() || "plaintext";
      createFile(name, "file", ext);
    }
  };

  const handleCreateFolder = () => {
    const name = window.prompt("Enter folder name:");
    if (name) {
      createFile(name, "folder");
    }
  };

  const handleDeleteFile = (id: string) => {
    if (window.confirm("Are you sure you want to delete this?")) {
      deleteFile(id);
    }
  };

  const handleCreateProject = () => {
    const name = window.prompt("Enter project name:");
    if (name) {
      createProject(name);
    }
  };

  const fileTreeData = [
    {
      id: "root",
      name: project?.name || "Project",
      type: "folder" as const,
      children: files.map(f => ({
        id: f.id,
        name: f.path,
        type: f.type,
        content: f.content,
        language: f.language
      }))
    }
  ];

  const showCenterArea = viewState.editor || viewState.preview || viewState.terminal;
  const showTopCenterArea = viewState.editor || viewState.preview;

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-zinc-200 overflow-hidden">
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        viewState={viewState}
        onToggleView={(key) => setViewState(prev => ({ ...prev, [key]: !prev[key] }))}
        projects={projects}
        currentProject={project}
        onSwitchProject={switchProject}
        onCreateProject={handleCreateProject}
      />

      <main className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-cyan-400 font-mono animate-pulse">Loading workspace...</div>
          </div>
        ) : (
          <PanelGroup direction="horizontal">
            {viewState.fileTree && (
              <>
                <Panel defaultSize={20} minSize={10} className="flex flex-col bg-[#0a0a0a]">
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <FileTree
                      files={fileTreeData}
                      onSelect={(file) => file.type === "file" && setSelectedFileId(file.id)}
                      onCreateFile={handleCreateFile}
                      onCreateFolder={handleCreateFolder}
                      onDeleteFile={handleDeleteFile}
                      selectedFileId={selectedFileId || ""}
                    />
                  </div>
                  <Analytics />
                </Panel>
                <ResizeHandle direction="horizontal" />
              </>
            )}

            {showCenterArea && (
              <>
                <Panel defaultSize={55} minSize={30} className="flex flex-col bg-[#050505]">
                  <PanelGroup direction="vertical">
                    {showTopCenterArea && (
                      <>
                        <Panel defaultSize={70} minSize={20}>
                          <PanelGroup direction="horizontal">
                            {viewState.editor && (
                              <>
                                <Panel defaultSize={60} minSize={20} className="flex flex-col p-4 pb-2 pr-2">
                                  <div className="flex items-center justify-between mb-2 px-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Buffer</span>
                                      <span className="text-xs text-cyan-400 font-mono">{selectedFile?.path || "No file selected"}</span>
                                    </div>
                                    {selectedFile && (
                                      <button
                                        onClick={() => {
                                          alert("AI Auditor initialized. Reviewing " + selectedFile.path + "...");
                                        }}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
                                      >
                                        <Zap size={12} />
                                        AUDIT CODE
                                      </button>
                                    )}
                                  </div>
                                  {selectedFile ? (
                                    <CodeEditor
                                      value={selectedFile.content}
                                      language={selectedFile.language}
                                      onChange={(val) => updateFileContent(selectedFile.id, val || "")}
                                    />
                                  ) : (
                                    <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-sm">
                                      Select a file to edit
                                    </div>
                                  )}
                                </Panel>
                                {viewState.preview && <ResizeHandle direction="horizontal" />}
                              </>
                            )}

                            {viewState.preview && (
                              <Panel defaultSize={40} minSize={20} className="flex flex-col p-4 pb-2 pl-2 hidden lg:flex">
                                <div className="flex items-center gap-2 mb-2 px-2">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Visualizer</span>
                                </div>
                                <Preview />
                              </Panel>
                            )}
                          </PanelGroup>
                        </Panel>
                        {viewState.terminal && <ResizeHandle direction="vertical" />}
                      </>
                    )}

                    {viewState.terminal && (
                      <Panel defaultSize={30} minSize={10} className="flex flex-col p-4 pt-2">
                        <div className="h-full border border-zinc-800 rounded-lg overflow-hidden">
                          <Terminal />
                        </div>
                      </Panel>
                    )}
                  </PanelGroup>
                </Panel>
                <ResizeHandle direction="horizontal" />
              </>
            )}

            <Panel defaultSize={25} minSize={15} className="flex flex-col">
              <Chat
                projectId={project?.id}
                activeFile={selectedFile ? { path: selectedFile.path, content: selectedFile.content } : undefined}
                allFiles={files.map(f => ({ id: f.id, path: f.path, content: f.content }))}
                onUpdateFile={updateFileContent}
                onCreateFile={(p, content, lang) => createFile(p, "file", lang).then(() => {})}
                onDeleteFile={deleteFile}
              />
            </Panel>
          </PanelGroup>
        )}
      </main>

      <footer className="h-6 bg-cyan-500 flex items-center px-4 justify-between text-[10px] font-bold text-black uppercase tracking-widest z-10">
        <div className="flex items-center gap-4">
          <span>Project: {project?.name || "None"}</span>
          <span>Branch: main</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Open-Source</span>
          <span>Provider-Free</span>
          <span>All Languages</span>
        </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
