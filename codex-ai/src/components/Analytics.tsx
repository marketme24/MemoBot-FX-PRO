import React from 'react';
import { Activity, Cpu, Database, Zap, ShieldCheck } from 'lucide-react';

export const Analytics = () => {
  return (
    <div className="p-4 bg-[#0a0a0a] border-t border-zinc-800">
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Neural Analytics</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Cpu size={14} className="text-cyan-400" />
            <span className="text-xs">AI Processing</span>
          </div>
          <span className="text-xs font-mono text-cyan-400">98.4%</span>
        </div>
        <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
          <div className="bg-cyan-500 h-full w-[98.4%]" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Database size={14} className="text-purple-400" />
            <span className="text-xs">Cloud Sync</span>
          </div>
          <span className="text-xs font-mono text-purple-400">Active</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck size={14} className="text-green-400" />
            <span className="text-xs">Security Audit</span>
          </div>
          <span className="text-xs font-mono text-green-400">Passed</span>
        </div>

        <div className="pt-2 border-t border-zinc-900 mt-2">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">
            <Activity size={10} className="animate-pulse" />
            <span>Real-time Neural Link Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
