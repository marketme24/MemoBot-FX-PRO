import { Play, Globe, Eye } from "lucide-react";

export const Preview = () => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 border-b border-zinc-200">
        <div className="flex items-center gap-2 text-zinc-600">
          <Globe size={14} />
          <span className="text-xs font-bold uppercase tracking-widest">Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">
            <div className="w-1 h-1 rounded-full bg-green-600 animate-pulse" />
            SYNCED
          </div>
          <button className="p-1 text-zinc-400 hover:text-cyan-600">
            <Play size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-zinc-50 text-zinc-400 italic text-sm">
        <div className="text-center">
          <Eye size={32} className="mx-auto mb-2 opacity-20" />
          <p>Rendering engine ready.</p>
          <p className="text-xs mt-1">Execute code to see output.</p>
        </div>
      </div>
    </div>
  );
};
