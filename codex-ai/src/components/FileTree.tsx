import React, { useState, useMemo } from "react";
import { Folder, File, ChevronRight, ChevronDown, Plus, Trash2, Search, FilePlus, FolderPlus } from "lucide-react";
import { cn } from "../lib/utils";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
}

interface FileTreeProps {
  files: FileNode[];
  onSelect: (file: FileNode) => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  onDeleteFile?: (id: string) => void;
  selectedFileId?: string;
}

export const FileTree = ({ files, onSelect, onCreateFile, onCreateFolder, onDeleteFile, selectedFileId }: FileTreeProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;

    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce((acc: FileNode[], node) => {
        const matches = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (node.type === 'folder' && node.children) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0 || matches) {
            acc.push({ ...node, children: filteredChildren });
          }
        } else if (matches) {
          acc.push(node);
        }
        
        return acc;
      }, []);
    };

    return filterNodes(files);
  }, [files, searchQuery]);

  return (
    <div className="p-4 text-zinc-400 font-sans select-none flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Explorer</h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={onCreateFile}
            title="New File"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-cyan-400 transition-colors"
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={onCreateFolder}
            title="New Folder"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-cyan-400 transition-colors"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input 
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md py-1.5 pl-9 pr-3 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-all"
        />
      </div>

      <div className="space-y-1 overflow-y-auto flex-1 scrollbar-hide">
        {filteredFiles.map(node => (
          <TreeNode 
            key={node.id} 
            node={node} 
            onSelect={onSelect} 
            onDelete={onDeleteFile}
            selectedFileId={selectedFileId} 
            depth={0} 
            isSearching={searchQuery.length > 0}
          />
        ))}
        {filteredFiles.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-xs italic">
            No files found
          </div>
        )}
      </div>
    </div>
  );
};

interface TreeNodeProps {
  node: FileNode;
  onSelect: (file: FileNode) => void;
  onDelete?: (id: string) => void;
  selectedFileId?: string;
  depth: number;
  isSearching?: boolean;
  key?: string | number;
}

const TreeNode = ({ node, onSelect, onDelete, selectedFileId, depth, isSearching }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedFileId === node.id;

  // Auto-expand folders when searching
  const shouldBeOpen = isSearching ? true : isOpen;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(node.id);
  };

  if (node.type === 'folder') {
    return (
      <div>
        <div 
          className="flex items-center gap-2 py-1 px-2 hover:bg-zinc-800/50 rounded cursor-pointer group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {shouldBeOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={14} className="text-cyan-500/70" />
          <span className="text-sm group-hover:text-zinc-200 transition-colors flex-1">{node.name}</span>
          {node.id !== 'root' && (
            <button 
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {shouldBeOpen && node.children?.map(child => (
          <TreeNode 
            key={child.id} 
            node={child} 
            onSelect={onSelect} 
            onDelete={onDelete}
            selectedFileId={selectedFileId} 
            depth={depth + 1} 
            isSearching={isSearching}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 py-1 px-2 rounded cursor-pointer group transition-all",
        isSelected ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500" : "hover:bg-zinc-800/50"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelect(node)}
    >
      <File size={14} className={cn(isSelected ? "text-cyan-400" : "text-zinc-500")} />
      <span className={cn("text-sm transition-colors flex-1", isSelected ? "text-cyan-400" : "group-hover:text-zinc-200")}>
        {node.name}
      </span>
      <button 
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};
