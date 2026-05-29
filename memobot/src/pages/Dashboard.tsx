import React from "react";
import { MemoBotIcon } from "../components/MemoBotIcon";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../contexts/LanguageContext";
import { useLayout } from "../contexts/LayoutContext";
import { useSettings } from "../contexts/SettingsContext";
import { trpc } from "../lib/trpc";
import { cn } from "../lib/utils";
import { toast } from 'sonner';
import { Activity, Bot, TrendingDown, TrendingUp, Wallet, RefreshCw, StopCircle, ShieldCheck, Brain, Zap, Fingerprint, Radar, Flame, Network } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";
import { Reorder } from "motion/react";

import { TradingActionsPanel } from "../components/TradingActionsPanel";
import { SystemHealthBot } from "../plugins/SystemHealthBot";

function PanelWrapper({ children, id, isEditMode }: { children: React.ReactNode; id: string; isEditMode: boolean; }) {
  return (
    <Reorder.Item 
      value={id} 
      dragListener={isEditMode}
      className={cn("relative", isEditMode && "cursor-grab active:cursor-grabbing")}
    >
      {children}
    </Reorder.Item>
  );
}

function StatCard({ label, value, sub, icon: Icon, color = "text-primary", tooltip }: { label: string; value: string; sub?: React.ReactNode; icon: any; color?: string; tooltip?: string }) {
  const { f } = useLanguage();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="bg-[#050505]/80 backdrop-blur-md border border-[var(--primary)]/10 rounded-xl p-5 space-y-3 shadow-lg group hover:border-[var(--primary)]/30 transition-all text-primary cursor-help">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{label}</span>
            <div className={cn("p-2 rounded-lg bg-slate-900/50 border border-slate-800 transition-colors", color)}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold price-display transition-colors">{f(value)}</div>
          {sub && <div className="text-[10px] text-gray-400 font-mono">{sub}</div>}
        </div>
      </TooltipTrigger>
      {tooltip && (
        <TooltipContent side="bottom" className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl max-w-xs text-center z-[1000] p-3 text-[10px] font-bold tracking-widest uppercase">
          {tooltip}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export default function Dashboard({ mode }: { mode?: 'real' | 'paper' }) {
  const { user } = useAuth() as any;
  const { t, f, language } = useLanguage();
  const { settings: layoutSettings, updateSetting } = useLayout();
  const { settings, updateSettings: updateSettingsState } = useSettings();
  
  const isLive = true; // Dashboard only shows real trades
  const { data: perf } = trpc.analytics.performance.useQuery({ mode: 'real' });
  const { data: bot } = trpc.bot.status.useQuery({ mode: 'real' });
  const { data: positions } = trpc.trading.positions.useQuery({ mode: 'real' });
  const { data: orders } = trpc.trading.orders.useQuery({ 
     mode: 'real',
     apiKey: settings.exchange.binanceApiKey,
     apiSecret: settings.exchange.binanceApiSecret
  });
  const { data: equity } = trpc.analytics.equityCurve.useQuery({ mode: 'real' });
  const { data: realBalanceData, isLoading: isRealBalanceLoading } = trpc.trading.getRealBalance.useQuery(
    { apiKey: settings.exchange.binanceApiKey, apiSecret: settings.exchange.binanceApiSecret },
    { enabled: !!settings.exchange.binanceApiKey }
  );
  const { data: ibrainState } = trpc.ibrain.getState.useQuery(undefined, { refetchInterval: 5000 });
  const { data: botLogs } = trpc.bot.logs.useQuery({ mode: 'real' }, { refetchInterval: 5000 });
  const trpcUtils = trpc.useUtils();

  console.log("realBalanceData:", realBalanceData);

  let balance = parseFloat(user?.liveBalance || "0");
  if (settings.exchange.binanceApiKey) {
     if (realBalanceData?.success) {
        balance = realBalanceData.balance;
     } else if (!isRealBalanceLoading && realBalanceData?.error) {
        console.error("Balance fetch error:", realBalanceData.error);
        // keep fallback balance
     }
  }
  
  const totalPnl = perf?.totalPnL ?? 0;

  const [showLogs, setShowLogs] = React.useState(true);

  const renderPanel = (id: string) => {
    switch(id) {
      case 'ibrain':
        const rFactor = ibrainState?.marketIntel.riskLevel || 'UNKNOWN';
        const intelTrend = ibrainState?.marketIntel.trend || 'UNKNOWN';
        const intelVol = ibrainState?.marketIntel.volatility || 0;
        const totalMem = ibrainState?.memoryStats.totalMemories || 0;
        const stratKeys = Object.keys(ibrainState?.strategyStates || {});
        const stratActive = stratKeys.length > 0 ? ibrainState?.strategyStates[stratKeys[0]].currentState : 'N/A';

        return (
          <PanelWrapper id="ibrain" isEditMode={layoutSettings.isEditMode}>
            <div className="bg-[#050505]/80 border border-violet-500/20 rounded-xl p-6 shadow-[0_0_30px_rgba(139,92,246,0.05)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-700 pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                    <Brain className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-violet-400 uppercase tracking-[0.2em] animate-pulse">I-Brain Dashboard</h2>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wider">Neural Engine Cluster • Operational</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                       Live Intelligence
                   </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                 {/* Market Intelligence */}
                 <div className="bg-black/40 border border-white/5 rounded-lg p-4 hover:border-violet-500/30 transition-all">
                    <div className="flex items-center gap-2 text-gray-400 mb-3">
                       <Radar className="w-4 h-4 text-blue-400" />
                       <span className="text-[10px] uppercase font-bold tracking-widest">Market Intel</span>
                    </div>
                    <div className="text-xl font-black text-white mb-1">{intelTrend}</div>
                    <p className="text-[9px] text-gray-500 font-mono leading-tight">Vol: {(intelVol * 100).toFixed(1)}%. Real-time environment analysis active.</p>
                 </div>

                 {/* Strategy Matrix */}
                 <div className="bg-black/40 border border-white/5 rounded-lg p-4 hover:border-violet-500/30 transition-all">
                    <div className="flex items-center gap-2 text-gray-400 mb-3">
                       <Network className="w-4 h-4 text-emerald-400" />
                       <span className="text-[10px] uppercase font-bold tracking-widest">Strategy State</span>
                    </div>
                    <div className="text-xl font-black text-white mb-1">{stratActive}</div>
                    <p className="text-[9px] text-gray-500 font-mono leading-tight">Dynamic weight optimization applied. Self-evaluating performance.</p>
                 </div>

                 {/* Memory Insights */}
                 <div className="bg-black/40 border border-white/5 rounded-lg p-4 hover:border-violet-500/30 transition-all">
                    <div className="flex items-center gap-2 text-gray-400 mb-3">
                       <Fingerprint className="w-4 h-4 text-amber-400" />
                       <span className="text-[10px] uppercase font-bold tracking-widest">Memory Nodes</span>
                    </div>
                    <div className="text-xl font-black text-white mb-1">{totalMem} Vectors</div>
                    <p className="text-[9px] text-gray-500 font-mono leading-tight">Persistent memory loaded. Short and long-term outcomes retained.</p>
                 </div>

                 {/* Risk & Alerts */}
                 <div className="bg-black/40 border border-white/5 rounded-lg p-4 hover:border-violet-500/30 transition-all">
                    <div className="flex items-center gap-2 text-gray-400 mb-3">
                       <Flame className={cn("w-4 h-4", rFactor === 'EXTREME' || rFactor === 'HIGH' ? "text-red-500" : "text-emerald-500")} />
                       <span className="text-[10px] uppercase font-bold tracking-widest">Risk Factor</span>
                    </div>
                    <div className={cn("text-xl font-black mb-1", rFactor === 'EXTREME' || rFactor === 'HIGH' ? "text-red-500" : "text-white")}>{rFactor}</div>
                    <p className="text-[9px] text-gray-500 font-mono leading-tight">Behavior Engine enforces strict limits based on risk scores.</p>
                 </div>
              </div>
              
              {/* Decision Logs */}
              <div className="mt-6 pt-6 border-t border-white/10">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Latest Neural Decisions</h3>
                 <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {ibrainState?.decisionLogs?.slice(0, 5).map((log: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2.5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            log.confidence > 0.6 ? "bg-emerald-500" : log.confidence > 0.3 ? "bg-amber-500" : "bg-rose-500"
                          )} />
                          <span className="text-xs font-mono text-gray-300">{log.message}</span>
                        </div>
                        <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                          CONF: {(log.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                    {(!ibrainState?.decisionLogs || ibrainState.decisionLogs.length === 0) && (
                      <div className="text-xs font-mono text-gray-600 italic">No decisions logged yet...</div>
                    )}
                 </div>
              </div>
            </div>
          </PanelWrapper>
        );
      case 'stats':
        return (
          <PanelWrapper id="stats" isEditMode={layoutSettings.isEditMode}>
            {isLive && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex-1 mb-4 flex items-center gap-3">
                <ShieldCheck size={18} className="text-rose-500 shrink-0" />
                <div>
                  <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">{t('liveModeActive' as any) || 'Live Mode Active'}</div>
                  <p className="text-[9px] text-rose-500/80 font-mono leading-tight">
                    Real exchange connection is active. Live risk limits apply. Reconciliation active.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard 
                label={t("accountBalance")} 
                value={`${balance.toLocaleString()} USDT`} 
                sub={realBalanceData?.error ? <span className="text-red-500 truncate" title={realBalanceData.error}>{realBalanceData.error.substring(0, 20)}...</span> : (t("realUsdt" as any))} 
                icon={Wallet} 
                color={realBalanceData?.error ? "text-red-500" : "text-primary"}
                tooltip="Displays your current total portfolio value in USD"
              />
              <StatCard label={t("totalPnL")} value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`} sub={`${((perf as any)?.totalPnlPct)?.toFixed(2) ?? "0.00"}%`} icon={totalPnl >= 0 ? TrendingUp : TrendingDown} color={totalPnl >= 0 ? "text-primary" : "text-primary"} tooltip="Net profit or loss across all your trades" />
              <StatCard label={t("openPositions")} value={String(positions?.length ?? 0)} sub={`${f(perf?.totalTrades ?? 0)} ${t("totalTrades")}`} icon={Activity} color="text-[var(--primary)]" tooltip="Currently active trading positions in the market" />
              <StatCard label={t("botStatus")} value={t(bot?.status as any || "stopped")} sub={`${f((bot?.totalSignals as number) ?? 0)} ${t('trades' as any)}`} icon={bot?.status === 'running' ? MemoBotIcon : StopCircle} color={bot?.status === 'running' ? "text-primary" : "text-gray-500"} tooltip="Current operational status of your automated trading bot" />
              <div className={cn("border rounded-xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group transition-all", isLive ? "bg-rose-500/5 border-rose-500/20" : "bg-[#050505]/80 border-emerald-500/20")}>
                 <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <RefreshCw size={80} className={cn("animate-spin-slow", isLive ? "text-primary" : "text-primary")} />
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">{isLive ? t('realProtocol' as any) : t('nodeHealth' as any)}</span>
                    <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse", isLive ? "bg-rose-500 shadow-rose-500/80" : "bg-emerald-500")} />
                 </div>
                 <div className="mt-4">
                    <div className="text-xl font-black text-primary italic tracking-tighter uppercase leading-none">{isLive ? t('live' as any) : t('automated' as any)}</div>
                    <div className={cn("text-[9px] font-bold uppercase mt-1 tracking-widest", isLive ? "text-primary" : "text-primary")}>{isLive ? t('warningActiveExposure' as any) : t('masterDnaLocked' as any)}</div>
                 </div>
              </div>
            </div>
          </PanelWrapper>
        );
      case 'chart':
        return (
          <PanelWrapper id="chart" isEditMode={layoutSettings.isEditMode}>
            <div className="bg-[#050505]/50 border border-[var(--primary)]/10 rounded-xl p-6 shadow-xl relative overflow-hidden">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t("equityCurve")}</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={(!equity || equity.length === 0) ? [{ date: t('today' as any), equity: balance }, { date: 'Now', equity: balance }] : equity}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: '#111' }} tickLine={{ stroke: '#111' }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: '#111' }} tickLine={{ stroke: '#111' }} domain={['auto', 'auto']} tickFormatter={(v) => f(v)} />
                    <RechartsTooltip 
                      formatter={(v) => [f(v as number), t('overview' as any)]}
                      contentStyle={{ background: "#050505", border: "1px solid var(--primary-secondary)", borderRadius: "12px", fontSize: "12px", color: '#f8fafc' }} 
                      itemStyle={{ color: 'var(--primary)' }} 
                    />
                    <Area type="monotone" dataKey="equity" stroke="var(--primary)" fill="url(#equityGrad)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </PanelWrapper>
        );
      case 'activity':
        return (
          <PanelWrapper id="activity" isEditMode={layoutSettings.isEditMode}>
            <div className="bg-[#050505]/50 border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('liveActivity_')}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-[9px] text-primary font-bold uppercase">{t('live')}</span>
                </div>
              </div>
              <div className="space-y-4">
                {(orders?.slice(0, 3) || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg text-[10px] font-black w-14 text-center", item.side.toUpperCase() === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>
                        {item.side.toUpperCase() === 'BUY' ? t('buy') : t('sell')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary tracking-tight">{item.symbol}</p>
                        <p className="text-[9px] text-gray-400 font-mono">
                          {item.fills?.length ? `Avg: @${f(item.fills.reduce((sum: number, fill: any) => sum + fill.price * fill.qty, 0) / item.fills.reduce((sum: number, fill: any) => sum + fill.qty, 0))} USDT` : `@${f(item.price)} USDT`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-primary">{item.status}</p>
                      <p className="text-[8px] text-gray-500 font-mono mt-1">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!orders || orders.length === 0) && (
                   <div className="text-center p-4 text-xs text-gray-500">No recent real executions</div>
                )}
                
                {showLogs && (
                   <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg mt-4 max-h-32 overflow-y-auto font-mono text-[9px] text-gray-400 space-y-1 custom-scrollbar">
                     {botLogs && botLogs.length > 0 ? (
                       botLogs.map((log: any) => (
                         <div key={log.id} className={log.level === 'warn' ? 'text-amber-500' : log.level === 'error' ? 'text-rose-500' : 'text-gray-400'}>
                           <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                         </div>
                       ))
                     ) : (
                       <div className="opacity-50 italic">No logs available...</div>
                     )}
                   </div>
                )}
              </div>
              <button onClick={() => setShowLogs(!showLogs)} className="w-full mt-6 py-2 text-[10px] font-black text-gray-500 hover:text-primary uppercase tracking-widest border-t border-white/5 pt-4 transition-colors">
                {showLogs ? 'HIDE LOGS' : (t('auditLogs' as any) || 'AUDIT LOGS')}
              </button>
            </div>
          </PanelWrapper>
        );
      case 'trading':
        return (
          <PanelWrapper id="trading" isEditMode={layoutSettings.isEditMode}>
            <TradingActionsPanel mode="real" />
          </PanelWrapper>
        );
      default: return null;
    }
  };

  const panels = layoutSettings.panelOrder.includes('trading') 
    ? layoutSettings.panelOrder.filter(id => id !== 'trading')
    : layoutSettings.panelOrder;

  return (
    <div className={cn("space-y-6 transition-all duration-500", layoutSettings.isEditMode && "bg-[var(--primary)]/5 p-4 rounded-3xl ring-2 ring-[var(--primary)]/20 ring-inset")}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className={cn("text-xl font-bold transition-all text-primary", bot?.status === "running" && "animate-pulse")}>
            <span style={{ color: bot?.status === "running" ? 'var(--primary)' : 'white' }}>{t("dashboard")}</span> 
            {bot?.status === "running" && <span className="text-sm font-normal opacity-70 ml-2">🤖 {t('botActive' as any)}</span>}
          </h1>
          <p className="text-sm text-gray-400 italic">{t('welcomeBack' as any)}, {user?.name || t('trader' as any)}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => { toast.success('Dashboard Refreshed'); window.location.reload(); }} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10">
            <RefreshCw size={14} /> {t('refresh' as any) || 'Refresh'}
          </button>
          <button onClick={() => {
             const newAction = bot?.status === 'running' ? 'pause' : 'start';
             trpcUtils.client.bot.control.mutate({ action: newAction, mode: isLive ? 'real' : 'paper' }).then(() => {
                toast.success(newAction === 'pause' ? 'Bot Paused' : 'Bot Resumed');
                trpcUtils.bot.status.invalidate();
             }).catch(e => toast.error(e.message));
          }} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] transition-colors border border-[var(--primary)]/20">
            {bot?.status === 'running' ? <StopCircle size={14} /> : <Activity size={14} />}
            {bot?.status === 'running' ? (t('pauseBot' as any) || 'Pause Bot') : (t('resumeBot' as any) || 'Resume Bot')}
          </button>
          <button onClick={() => setShowLogs(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10">
            <Bot size={14} /> {t('logs' as any) || 'Logs'}
          </button>
        </div>
      </div>
      
      <SystemHealthBot />

      <Reorder.Group axis="y" values={panels} onReorder={(newOrder) => updateSetting('panelOrder', newOrder)} className="space-y-6">
        {panels.map((id) => (
          <React.Fragment key={id}>
            {renderPanel(id)}
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  );
}