import React, { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { useLanguage } from '../contexts/LanguageContext';
import { Network, Plus, Settings2, Play, Square, Cpu, Activity, AlertTriangle, ShieldCheck, Database, Zap, ChevronDown, RefreshCw, Clock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function StrategyManager() {
  const { t, f } = useLanguage();
  const { data: riskConfig } = trpc.risk.getConfig.useQuery();
  
  const { data: profile } = trpc.admin.getProfile.useQuery();
  
  const [strategies, setStrategies] = React.useState(() => {
    const saved = localStorage.getItem(`bot_strategies_v2`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 1, name: 'Neural Alpha-Scalper', target: 'BTC/USDT', status: 'active', pnl: '+420.50', winRate: '75.4', score: 98, tradeAmount: 10, sharpe: 2.1, dd: '4.2', uptime: '99.9' },
      { id: 2, name: 'Multi-Timeframe Trend', target: 'ETH/USDT', status: 'paused', pnl: '+12.50', winRate: '62.1', score: 82, tradeAmount: 10, sharpe: 1.5, dd: '8.1', uptime: '99.9' },
      { id: 3, name: 'Liquidity Hunter', target: 'SOL/USDT', status: 'active', pnl: '-54.20', winRate: '45.0', score: 65, tradeAmount: 10, sharpe: 0.8, dd: '15.4', uptime: '99.9' },
      { id: 4, name: 'Mean Reversion Grid', target: 'XRP/USDT', status: 'active', pnl: '+112.40', winRate: '68.2', score: 88, tradeAmount: 10, sharpe: 1.8, dd: '6.5', uptime: '99.9' },
      { id: 5, name: 'Volatility Breakout AI', target: 'BNB/USDT', status: 'paused', pnl: '+89.10', winRate: '71.5', score: 91, tradeAmount: 10, sharpe: 1.9, dd: '5.2', uptime: '99.9' },
      { id: 6, name: 'Sentiment Momentum', target: 'ADA/USDT', status: 'paused', pnl: '-15.80', winRate: '54.3', score: 60, tradeAmount: 10, sharpe: 0.6, dd: '12.0', uptime: '99.9' },
      { id: 7, name: 'Statistical Arbitrage', target: 'DOGE/USDT', status: 'active', pnl: '+214.60', winRate: '81.0', score: 95, tradeAmount: 10, sharpe: 2.8, dd: '2.1', uptime: '99.9' },
      { id: 8, name: 'Orderbook Sentinel', target: 'AVAX/USDT', status: 'active', pnl: '+45.20', winRate: '66.8', score: 78, tradeAmount: 10, sharpe: 1.2, dd: '9.4', uptime: '99.9' },
      { id: 9, name: 'Whale Tracker AI', target: 'LINK/USDT', status: 'paused', pnl: '-10.50', winRate: '49.1', score: 62, tradeAmount: 10, sharpe: 0.9, dd: '11.8', uptime: '99.9' },
      { id: 10, name: 'Fractal Price Action', target: 'DOT/USDT', status: 'active', pnl: '+67.80', winRate: '70.2', score: 85, tradeAmount: 10, sharpe: 1.6, dd: '7.3', uptime: '99.9' }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`bot_strategies_v2`, JSON.stringify(strategies));
  }, [strategies]);

  const [editingParams, setEditingParams] = React.useState<number | null>(null);
  const [editingAmount, setEditingAmount] = React.useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedDetails, setExpandedDetails] = React.useState<Set<number>>(new Set());

  const toggleDetails = (id: number) => {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeExposure = strategies.filter(s => s.status === 'active').reduce((sum, s) => sum + s.tradeAmount, 0);
  const isOverExposed = riskConfig ? activeExposure > 1000 : false;

  const handleCreate = () => {
    const targets = ['MATIC/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'NEAR/USDT'];
    
    setStrategies(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(s => s.id)) + 1 : 1;
      const newStrat = {
        id: newId,
        name: `NEW STRATEGY ${newId}`,
        target: targets[Math.floor(Math.random() * targets.length)],
        status: 'paused',
        pnl: '+0.00',
        winRate: (Math.random() * 30 + 50).toFixed(1),
        score: Math.floor(Math.random() * 40 + 60),
        tradeAmount: 10,
        sharpe: (Math.random() * 2 + 0.5).toFixed(1) as any,
        dd: (Math.random() * 15 + 2).toFixed(1),
        uptime: '100.0'
      };
      return [newStrat, ...prev];
    });
  };

  // Simulate real-time metric fluctuations for active strategies
  useEffect(() => {
    const interval = setInterval(() => {
      setStrategies(prev => prev.map(s => {
        if (s.status !== 'active') return s;
        // slightly fluctuate win probability / PnL for visual realism
        const numPnl = parseFloat(s.pnl.replace('+', ''));
        const nextPnl = numPnl + (Math.random() * 2 - 1);
        const signedPnl = nextPnl >= 0 ? `+${nextPnl.toFixed(2)}` : `${nextPnl.toFixed(2)}`;
        
        return {
          ...s,
          pnl: signedPnl,
          uptime: (parseFloat(s.uptime) - Math.random() * 0.001).toFixed(3)
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-black text-primary italic tracking-tighter uppercase flex items-center gap-4">
             <Network className="w-8 h-8 text-primary" />
             ALGORITHMIC ENGINES
          </h1>
          <p className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <Cpu size={12} className="text-primary" />
            Parallel Strategy Execution & Deep Telemetry
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 bg-[#050505] px-4 py-2 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
             <div className="text-right">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-shadow">System Exposure</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Database className="w-3 h-3 text-primary" />
                  <p className={cn("font-mono text-sm font-black", isOverExposed ? "text-primary" : "text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]")}>
                    {activeExposure.toFixed(2)} USDT
                  </p>
                </div>
             </div>
          </div>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] font-black uppercase tracking-widest text-[10px] transition-all">
            <Plus className="w-4 h-4 mr-2" />
            New Strategy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
        {strategies.map((strat, i) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            key={strat.id}
          >
          <Card className="bg-[#050505]/95 backdrop-blur-3xl border-white/5 overflow-hidden group hover:border-blue-500/30 transition-all shadow-xl hover:shadow-blue-500/10 flex flex-col h-full">
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-5 relative">
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                       {strat.status === 'active' && <span className="absolute inset-0 bg-emerald-500 blur-[4px] animate-pulse" />}
                       {strat.status === 'restarting' && <span className="absolute inset-0 bg-amber-500 blur-[4px] animate-pulse" />}
                       <span className={cn("w-2.5 h-2.5 rounded-sm relative block", strat.status === 'active' ? "bg-emerald-400" : strat.status === 'restarting' ? "bg-amber-400" : "bg-slate-600")} />
                    </div>
                    <h3 className="text-primary font-black uppercase tracking-widest text-sm drop-shadow-md">{strat.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                     <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-primary uppercase tracking-widest font-mono">
                       {strat.target}
                     </span>
                     {strat.status === 'active' && <span className="text-[9px] text-primary font-mono flex items-center gap-1 animate-pulse"><Zap size={10} />LIVE</span>}
                     {strat.status === 'restarting' && <span className="text-[9px] text-amber-500 font-mono flex items-center gap-1 animate-pulse"><RefreshCw size={10} className="animate-spin" />RESTARTING</span>}
                  </div>
                </div>
                <Switch 
                  checked={strat.status === 'active'} 
                  onCheckedChange={(c) => {
                    setStrategies(s => s.map(st => st.id === strat.id ? { ...st, status: c ? 'active' : 'paused' } : st));
                  }} 
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {/* Technical Indicator Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                 <div className="bg-[#0A0A0A] border border-white/5 p-3 rounded-lg flex flex-col justify-center relative overflow-hidden group-hover:border-white/10 transition-colors">
                    <div className="text-[8px] font-black uppercase text-gray-500 mb-1 flex justify-between">Net PnL</div>
                    <div className={cn("font-mono text-base font-black relative z-10", strat.pnl.startsWith('+') ? "text-primary drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]" : "text-primary")}>
                      {strat.pnl}
                    </div>
                 </div>
                 <div className="bg-[#0A0A0A] border border-white/5 p-3 rounded-lg flex flex-col justify-center group-hover:border-white/10 transition-colors">
                    <div className="text-[8px] font-black uppercase text-gray-500 mb-1 flex items-center gap-1">Real Win Rate <Activity size={8} className="text-primary" /></div>
                    <div className={cn(
                      "font-mono text-base font-black", 
                      strat.status === 'active' ? "text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.4)]" : "text-gray-600"
                    )}>
                      {strat.status === 'active' ? `${strat.winRate}%` : '---'}
                    </div>
                 </div>
              </div>

              {/* Advanced Stats Footer and Collapsible Details */}
              <div className="mt-auto pb-4">
                 <button 
                    onClick={() => toggleDetails(strat.id)}
                    className="flex w-full items-center justify-between py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-colors"
                 >
                    <span>Advanced Analytics</span>
                    <ChevronDown size={14} className={cn("transition-transform duration-300", expandedDetails.has(strat.id) ? "rotate-180" : "")} />
                 </button>
                 
                 {expandedDetails.has(strat.id) && (
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                       <div className="flex flex-col gap-1 border-r border-white/5 pr-2">
                          <span className="text-[8px] font-black tracking-widest text-gray-600 uppercase flex items-center gap-1"><ShieldCheck size={10}/> Sharpe</span>
                          <span className="text-xs font-mono font-bold text-primary/90">{strat.sharpe}</span>
                       </div>
                       <div className="flex flex-col gap-1 border-r border-white/5 px-2">
                          <span className="text-[8px] font-black tracking-widest text-gray-600 uppercase flex items-center gap-1"><AlertTriangle size={10}/> Max DD</span>
                          <span className="text-xs font-mono font-bold text-primary">-{strat.dd}%</span>
                       </div>
                       <div className="flex flex-col gap-1 pl-2">
                          <span className="text-[8px] font-black tracking-widest text-gray-600 uppercase flex items-center gap-1"><Cpu size={10}/> Model</span>
                          <span className={cn("text-xs font-mono font-bold", strat.score > 80 ? "text-primary" : "text-primary")}>v{strat.score}.0</span>
                       </div>
                    </div>
                 )}
              </div>

              {editingParams === strat.id ? (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-4 shadow-inner mt-2">
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase text-primary flex items-center gap-2"><Database size={12}/> Allocation (USDT)</span>
                     <span className="text-[10px] font-bold text-gray-400">Min: 10</span>
                   </div>
                   <input 
                     type="number" 
                     min="10"
                     value={editingAmount}
                     onChange={(e) => setEditingAmount(e.target.value)}
                     className="w-full bg-[#050505] border border-blue-500/30 rounded px-3 py-2 text-sm font-mono text-primary outline-none focus:border-blue-500/70 shadow-inner"
                   />
                   <div className="flex gap-2">
                     <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase transition-all" onClick={() => {
                        const val = parseFloat(editingAmount);
                        if (!val || val < 10) return;
                        setStrategies(s => s.map(st => st.id === strat.id ? { ...st, tradeAmount: val, status: 'restarting', lastAdjusted: Date.now() } : st));
                        setEditingParams(null);
                        setTimeout(() => {
                           setStrategies(s => s.map(st => st.id === strat.id && st.status === 'restarting' ? { ...st, status: 'active' } : st));
                        }, 2000);
                     }}>Commit</Button>
                     <Button size="sm" variant="outline" className="flex-1 text-[10px] font-black uppercase border-white/10 hover:bg-white/5" onClick={() => setEditingParams(null)}>Abort</Button>
                   </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 border-t border-white/10 pt-4 mt-2">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => {
                       setStrategies(s => s.map(st => st.id === strat.id ? { ...st, status: st.status === 'active' ? 'paused' : 'active' } : st));
                     }} 
                     className={cn(
                       "flex-1 border-white/10 font-black uppercase text-[10px] tracking-widest transition-all",
                       strat.status === 'active' 
                         ? "bg-rose-500/10 text-primary hover:bg-rose-500/20 hover:text-rose-300 border-rose-500/20" 
                         : "bg-emerald-500/10 text-primary hover:bg-emerald-500/20 hover:text-emerald-300 border-emerald-500/20"
                     )}
                   >
                     {strat.status === 'active' ? <Square className="w-3 h-3 mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                     {strat.status === 'active' ? "HALT ENGINE" : "ENGAGE ENGINE"}
                   </Button>
                   
                   <Button 
                     variant="outline" 
                     className="bg-[#0A0A0A] border-white/10 hover:border-blue-500/50 hover:text-primary font-mono text-xs flex items-center gap-2 group/amt flex-none w-24" 
                     onClick={() => {
                        setEditingParams(strat.id);
                        setEditingAmount(strat.tradeAmount.toString());
                     }}
                     title="Edit Allocation"
                   >
                     <span>${strat.tradeAmount}</span>
                     <Settings2 className="w-3 h-3 opacity-50 group-hover/amt:opacity-100 transition-opacity" />
                   </Button>
                </div>
              )}
              {(strat as any).lastAdjusted && (
                 <div className="text-[7.5px] text-gray-500 font-bold uppercase tracking-widest mt-3 flex items-center gap-1 justify-end w-full border-t border-white/5 pt-2">
                    <Clock size={9} />
                    Adjusted: {new Date((strat as any).lastAdjusted).toLocaleTimeString()}
                 </div>
              )}
            </div>
          </Card>
          </motion.div>
        ))}
        </AnimatePresence>
        
        {strategies.length === 0 && (
          <div className="col-span-full border border-dashed border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center text-center bg-[#050505]">
             <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 mb-6">
                <Network className="w-10 h-10 text-gray-500" />
             </div>
             <h3 className="text-primary font-black uppercase tracking-widest mb-2 text-lg">Null State</h3>
             <p className="text-gray-500 font-mono text-xs uppercase tracking-widest max-w-sm mb-8">System awaiting initial vector deployment. Awaiting operator input.</p>
             <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-[10px]">
               <Plus className="w-4 h-4 mr-2" /> New Strategy
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}

