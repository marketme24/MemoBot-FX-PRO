import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";
import { TrendingUp, Activity, Target, Zap, Play, Square, Settings2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";

interface StrategyPanelProps {
  strategy: {
    id: number;
    name: string;
    type: string;
    isActive: boolean;
    winRate: number;
    totalTrades: number;
    performance: any[];
  };
  onToggle: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export function StrategyPanel({ strategy, onToggle, onDelete, onEdit }: StrategyPanelProps) {
  const { t, f, language } = useLanguage();

  return (
    <motion.div
      layout
      className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all flex flex-col h-full"
    >
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-primary uppercase italic tracking-tighter group-hover:text-primary transition-colors">
              {strategy.name}
            </h3>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                strategy.isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-600"
              )} />
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                {strategy.isActive ? t('running' as any) : t('stopped' as any)}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit?.(strategy.id)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-500 hover:text-primary hover:bg-white/10 transition-all"
            >
              <Settings2 size={12} />
            </button>
            <button 
              onClick={() => onDelete?.(strategy.id)}
              className="p-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-primary hover:text-primary hover:bg-rose-500 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">{t('winRate')}</span>
              <span className="text-sm font-black text-primary italic font-mono">{f(strategy.winRate)}%</span>
           </div>
           <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">{t('totalTrades')}</span>
              <span className="text-sm font-black text-primary italic font-mono">{f(strategy.totalTrades)}</span>
           </div>
        </div>

        <div className="h-24 w-full">
           <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={strategy.performance}>
                <defs>
                   <linearGradient id={`grad-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <Tooltip 
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      return (
                        <div className="bg-black/90 border border-white/10 p-2 rounded text-[10px] font-black text-primary">
                          {t('totalPnL' as any)}: {f(payload[0].value as any)}%
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="var(--primary)" 
                  fillOpacity={1} 
                  fill={`url(#grad-${strategy.id})`} 
                  strokeWidth={2}
                />
              </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>

      <button
        onClick={() => onToggle(strategy.id)}
        className={cn(
          "w-full py-4 text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-2 transition-all mt-auto",
          strategy.isActive 
            ? "bg-rose-500/10 text-primary hover:bg-rose-500 hover:text-primary" 
            : "bg-emerald-500/10 text-primary hover:bg-emerald-500 hover:text-black"
        )}
      >
        {strategy.isActive ? (
          <><Square size={10} fill="currentColor" /> {t('stop' as any)}</>
        ) : (
          <><Play size={10} fill="currentColor" /> {t('start' as any)}</>
        )}
      </button>
    </motion.div>
  );
}