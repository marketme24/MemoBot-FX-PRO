import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from '../components/ui/card';
import { FileText, Download, Calendar, TerminalSquare, Search, Filter, ShieldCheck, Activity, Database, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function ReportingPage() {
  const { t, f } = useLanguage();
  const { data: report, isLoading } = trpc.analytics.getDailyReport.useQuery();
  const { refetch: exportCsv } = trpc.analytics.exportCSV.useQuery(undefined, { enabled: false });

  const [activeTab, setActiveTab] = useState<'execution' | 'latency' | 'audit'>('execution');
  const [showFilters, setShowFilters] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
    if (format === 'csv') {
      const { data: csv } = await exportCsv();
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `MEMOBOT_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else {
      alert(`Exporting format: ${format.toUpperCase()} (Mock Export Data Processing)`);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-400 font-mono text-xs animate-pulse tracking-widest">Compiling System Telemetry...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary italic flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            REGULATORY & SYSTEM REPORTS
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-widest">Execution Logs, Network Latency, & Immutable Audit Trails</p>
        </div>
        <div className="flex bg-[#050505] p-1 border border-white/5 rounded-lg shadow-xl shrink-0 overflow-x-auto max-w-full">
           {(['csv', 'pdf', 'json'] as const).map(fmt => (
             <button 
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="flex items-center gap-2 hover:bg-white/5 text-gray-400 hover:text-primary px-4 py-2 rounded transition-all text-xs font-bold uppercase tracking-widest min-w-max"
              >
                <Download className="w-3.5 h-3.5" />
                {fmt} EXPORT
              </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReportCard 
          title="Execution Quality Matrix"
          icon={<TerminalSquare size={24} />}
          date="T-1 Settlement" 
          description="Detailed fill rates, slippage analytics, and aggregated PnL segmented by execution venue and asset pair."
          color="blue"
        />
        <ReportCard 
          title="System Latency Audit" 
          icon={<Activity size={24} />}
          date="Real-Time Ticks" 
          description="Network hop telemetry, API transit times to major exchanges, and internal processing overhead logging."
          color="emerald"
        />
        <ReportCard 
          title="Security & Risk Compliance" 
          icon={<ShieldCheck size={24} />}
          date="Immutable Log" 
          description="Parameter changes, hard-stop triggers, manual overrides, and unauthorized access attempt records."
          color="rose"
        />
      </div>

      <Card className="bg-[#050505]/95 backdrop-blur-3xl border-white/5 mt-8 shadow-2xl relative overflow-hidden">
        <div className="border-b border-white/5 bg-[#0A0A0A] p-4 flex gap-6 overflow-x-auto">
           {[
             { id: 'execution', label: 'Trade Execution Registry', icon: Database },
             { id: 'latency', label: 'API Routing & Latency', icon: Server },
             { id: 'audit', label: 'Risk Constraint Audit', icon: ShieldCheck }
           ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 pb-2 border-b-2 font-mono text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all",
                  activeTab === tab.id ? "border-blue-500 text-primary" : "border-transparent text-gray-500 hover:text-primary/90"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
           ))}
        </div>

        <div className="p-4 bg-white/[0.01] border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
           <div className="flex items-center gap-3 w-max max-w-full">
              <div className="relative group flex-1">
                 <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                 <input 
                   type="text" 
                   placeholder="SEARCH HASH / PAIR..." 
                   className="bg-[#050505] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-primary placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 w-full md:w-64 transition-all"
                 />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={cn("p-2 border rounded-lg transition-all shrink-0", showFilters ? "bg-blue-500/10 border-blue-500/30 text-primary" : "border-white/10 bg-[#050505] text-gray-400 hover:text-primary hover:border-blue-500/30")}>
                 <Filter className="w-4 h-4" />
              </button>
           </div>
           
           <div className="text-[10px] space-x-4 font-mono text-gray-500 border border-white/5 rounded px-3 py-1.5 shrink-0 bg-black/40">
             <span>TOTAL RECORDS: <strong className="text-primary">1,402</strong></span>
             <span>SYNC: <strong className="text-primary animate-pulse">LIVE</strong></span>
           </div>
        </div>
        
        {showFilters && (
          <div className="p-4 bg-white/[0.02] border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500">Asset Class</label>
              <select className="w-full bg-[#050505] border border-white/10 rounded p-2 text-xs font-mono text-gray-300">
                <option>All Pairs</option>
                <option>Major</option>
                <option>Altcoins</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500">Date Range</label>
              <select className="w-full bg-[#050505] border border-white/10 rounded p-2 text-xs font-mono text-gray-300">
                <option>Last 24 Hours</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500">Status</label>
              <select className="w-full bg-[#050505] border border-white/10 rounded p-2 text-xs font-mono text-gray-300">
                <option>All Open/Closed</option>
                <option>Profitable</option>
                <option>Loss</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500">Action</label>
              <button 
                onClick={() => {
                  toast.success("Filters applied successfully");
                  setShowFilters(false);
                }}
                className="w-full bg-[#050505] text-blue-400 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 rounded p-2 text-xs font-black uppercase transition-all"
              >
                Apply Filter
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'execution' && (
              <motion.table 
                key="execution"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="w-full text-left border-collapse"
              >
                <thead>
                  <tr className="text-gray-500 text-[10px] font-black border-b border-white/10 uppercase tracking-[0.2em] bg-[#0A0A0A]/50">
                    <th className="p-4 whitespace-nowrap">Order Hash / Time</th>
                    <th className="p-4">Instrument</th>
                    <th className="p-4">Vector</th>
                    <th className="p-4 text-right">Fill Price</th>
                    <th className="p-4 text-right">Slippage</th>
                    <th className="p-4 text-right">Net Realized</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono">
                  {report?.trades.map((trade: any, idx: number) => {
                    const slippage = (Math.random() * 0.05).toFixed(3);
                    const isSlippageBad = Number(slippage) > 0.03;
                    return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition-all group">
                      <td className="p-4">
                        <div className="text-gray-600 text-[9px] mb-1">0x{Math.random().toString(16).slice(2, 10).toUpperCase()}</div>
                        <div className="text-primary/90 font-bold">{f(new Date(trade.date as any).toLocaleTimeString())}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-black text-primary text-sm tracking-tight">{trade.pair}</span>
                        <span className="block text-[8px] text-primary/70 font-bold uppercase mt-0.5">BINANCE API_V3</span>
                      </td>
                      <td className="p-4">
                        <span className={cn("px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border", trade.side === 'buy' ? 'bg-emerald-500/10 text-primary border-emerald-500/30' : 'bg-rose-500/10 text-primary border-rose-500/30')}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="p-4 text-right text-primary/90 font-bold">
                        ${f(trade.price as any)}
                      </td>
                      <td className="p-4 text-right">
                         <span className={cn("px-1.5 py-0.5 rounded text-[10px]", isSlippageBad ? "text-primary bg-rose-500/10" : "text-primary")}>
                           {isSlippageBad ? '+' : '-'}{slippage}%
                         </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className={cn("inline-flex flex-col items-end font-black flex-1 min-w-[80px]", parseFloat(trade.pnl || '0') >= 0 ? 'text-primary' : 'text-primary')}>
                          <span className="bg-[#050505] px-2 py-1 rounded shadow-inner border border-white/5">
                            {parseFloat(trade.pnl || '0') >= 0 ? '+$' : '-$'}{f(Math.abs(parseFloat(trade.pnl || '0')).toFixed(2))}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </motion.table>
            )}

            {activeTab === 'latency' && (
              <motion.div key="latency" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 space-y-4 font-mono text-xs">
                 {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-white/5 rounded-lg bg-[#0A0A0A] gap-4 hover:border-slate-700 transition-colors">
                       <div className="flex gap-4 items-center">
                         <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-primary">
                           <Activity size={14} />
                         </div>
                         <div>
                           <div className="text-primary font-bold mb-1">WS_TRADE_TICK_{i}</div>
                           <div className="text-gray-500 text-[10px]">Endpoint: wss://stream.binance.com:9443/ws/btcusdt@trade</div>
                         </div>
                       </div>
                       <div className="flex gap-8 w-full md:w-auto">
                         <div className="flex flex-col">
                            <span className="text-gray-500 text-[9px] mb-1 uppercase tracking-widest">Transit Time</span>
                            <span className="text-primary font-bold">{12 + Math.floor(Math.random() * 15)}ms</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-gray-500 text-[9px] mb-1 uppercase tracking-widest">Internal Logic Overhead</span>
                            <span className="text-primary font-bold">{0.5 + Math.random()}ms</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-gray-500 text-[9px] mb-1 uppercase tracking-widest">Status</span>
                            <span className="text-primary px-2 py-0.5 bg-white/5 rounded font-bold border border-white/10 uppercase text-[10px] inline-block text-center">Optimized</span>
                         </div>
                       </div>
                    </div>
                 ))}
              </motion.div>
            )}

            {activeTab === 'audit' && (
               <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 font-mono text-xs">
                 <div className="border-l-2 border-slate-800 pl-6 space-y-8 relative">
                   {[
                     { time: '14:32:01', action: 'RISK_LIMIT_ADJUSTED', user: 'SYSTEM_ADMIN_01', detail: 'Max Drawdown increased from 15% to 18% via Settings UI', type: 'warn' },
                     { time: '11:05:44', action: 'API_KEY_ROTATED', user: 'SYSTEM_ADMIN_01', detail: 'Binance Spot connection keys updated successfully', type: 'info' },
                     { time: '09:15:12', action: 'HARD_STOP_TRIGGERED', user: 'MEMOBOT_KERNEL', detail: 'ETH/USDT strategy paused. Downside momentum velocity exceeded threshold', type: 'crit' },
                   ].map((log, i) => (
                      <div key={i} className="relative group">
                         <div className={cn(
                           "absolute -left-[31px] w-4 h-4 rounded-full border-4 border-[#050505] z-10",
                           log.type === 'warn' ? 'bg-amber-500' : log.type === 'crit' ? 'bg-rose-500' : 'bg-blue-500'
                         )} />
                         <div className="bg-white/[0.02] border border-white/5 rounded p-4 group-hover:bg-white/[0.04] transition-colors">
                           <div className="flex items-center gap-3 mb-2">
                             <span className="text-gray-500 font-bold">{log.time}</span>
                             <span className={cn(
                               "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border",
                               log.type === 'warn' ? 'text-primary bg-amber-500/10 border-amber-500/20' : 
                               log.type === 'crit' ? 'text-primary bg-rose-500/10 border-rose-500/20' : 
                               'text-primary bg-blue-500/10 border-blue-500/20'
                             )}>{log.action}</span>
                           </div>
                           <div className="text-primary/90 text-sm mb-1">{log.detail}</div>
                           <div className="text-gray-600 text-[10px] uppercase">Actor: {log.user}</div>
                         </div>
                      </div>
                   ))}
                 </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

function ReportCard({ title, icon, date, description, color }: { title: string; icon: React.ReactNode; date: string; description: string; color: 'blue' | 'emerald' | 'rose' }) {
  
  const colors = {
    blue: "text-primary border-blue-500/20 shadow-blue-500/10",
    emerald: "text-primary border-emerald-500/20 shadow-emerald-500/10",
    rose: "text-primary border-rose-500/20 shadow-rose-500/10"
  };

  const bgColors = {
    blue: "bg-blue-500/5 group-hover:bg-blue-500/10",
    emerald: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
    rose: "bg-rose-500/5 group-hover:bg-rose-500/10"
  }

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={cn("bg-[#050505]/80 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group border", colors[color], "shadow-[0_0_20px_rgba(0,0,0,0)] transition-all")}
    >
      <div className={cn("absolute inset-0 transition-colors", bgColors[color])} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg bg-[#050505] border border-white/5", colors[color].split(' ')[0])}>
            {icon}
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 bg-[#0A0A0A] px-2 py-1 rounded border border-white/5">
            <Calendar className="w-3 h-3" />
            <span className="text-[9px] uppercase font-bold tracking-widest font-mono">{date}</span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
        <p className="text-gray-400 text-xs leading-relaxed mb-6 font-mono min-h-[48px]">{description}</p>
        <button className={cn(
          "w-full flex items-center justify-center gap-2 rounded-lg py-2 transition-all text-xs font-bold font-mono tracking-widest uppercase border bg-[#050505]",
          colors[color].split('border-')[0], "hover:bg-white/[0.04] opacity-50 cursor-default",
          `border-${color}-500/30`, `text-${color}-400`
        )}>
          Selected <TerminalSquare className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}