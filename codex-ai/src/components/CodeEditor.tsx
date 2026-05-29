import React, { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "../hooks/useTheme";
import { Undo2, Redo2 } from "lucide-react";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

export const CodeEditor = ({ value, language, onChange }: CodeEditorProps) => {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const undo = () => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  };

  const redo = () => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  };

  return (
    <div className="h-full w-full flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={undo}
            className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button 
            onClick={redo}
            className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-all"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={value}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
};
