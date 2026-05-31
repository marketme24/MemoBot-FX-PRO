import { MemoBotIcon } from '../components/MemoBotIcon';
import { useLanguage } from "../contexts/LanguageContext";
import { trpc } from "../lib/trpc";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { motion } from "motion/react";
import React, { useState } from "react";
import { Bot, Play, Square, Pause, RotateCcw, Activity, Zap, Terminal, ShieldCheck, Mic, Bell } from "lucide-react";
import { Switch } from "../components/ui/switch";

import { useSettings } from "../contexts/SettingsContext";

const STATUS_COLORS: Record<string, string> = { running: "text-primary", stopped: "text-gray-500", paused: "text-yellow-500", error: "text-primary" };
const STATUS_BG: Record<string, string> = { running: "bg-emerald-500/10 border-emerald-500/30", stopped: "bg-slate-900/50 border-blue-500/10", paused: "bg-yellow-500/10 border-yellow-500/30", error: "bg-rose-500/10 border-rose-500/30" };

export default function BotControl() {
  const { t, f } = useLanguage();
  const { settings, updateSettings: updateSettingsState } = useSettings();
  const [uiMode, setUiMode] = useState<'paper' | 'real'>('real');
  
  const { data: bot, refetch } = trpc.bot.status.useQuery({ mode: 'real' }, { refetchInterval: 5000 });
  const utils = trpc.useUtils();

  const controlMut = trpc.bot.control.useMutation({
    onSuccess: (data: any) => { toast.success(`${t('botStatusPrefix' as any)} ${t(data.status) || data.status}`); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.bot.update.useMutation({
    onSuccess: () => {
      utils.bot.status.invalidate();
      toast.success(t('engineConfigSynced' as any));
    }
  });

  const status = (bot?.status as string) || "stopped";
  const botRunning = status === "running";
  const forcedMode = 'real';
  const { data: logs } = trpc.bot.logs.useQuery({ mode: 'real' }, { refetchInterval: 1000 });

  const [lastLogId, setLastLogId] = useState<number | null>(null);

  React.useEffect(() => {
    if (logs && logs.length > 0) {
      const latestLog = logs[0];
      if (lastLogId !== null && latestLog.id !== lastLogId) {
        if (bot?.notificationEnabled) {
          toast(latestLog.message);
        }
        if (bot?.voiceEnabled && 'speechSynthesis' in window) {
          const msg = new SpeechSynthesisUtterance(latestLog.message);
          window.speechSynthesis.speak(msg);
        }
      }
      setLastLogId(latestLog.id);
    }
  }, [logs, bot?.notificationEnabled, bot?.voiceEnabled, lastLogId]);

  return (
    <div className="space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/20 text-gray-400 p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <span>Automated Bot features are locked on Starter (Free) plan. Your $100K Paper Demo account is available for manual trading in the Manual Execution tab.</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <MemoBotIcon className={cn("w-5 h-5 transition-colors", botRunning ? "text-primary animate-pulse" : "text-gray-400")} />
            </div>
            <div>
              <h1 className={cn("text-xl font-bold italic tracking-tight", botRunning ? "text-primary" : "text-primary")}>{t("botControl")}</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('masterExecutionTerminal' as any)}</p>
            </div>
          </div>

          <div className={`border rounded-2xl p-8 transition-all backdrop-blur-xl ${STATUS_BG[status]} ${botRunning ? "shadow-[0_0_50px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/20" : "shadow-xl border-white/5"}`}>
            <div className="flex items-center justify-between flex-wrap gap-12">
              <div className="flex items-center gap-6">
                <div className={cn("w-24 h-24 rounded-3xl border flex items-center justify-center transition-all bg-black shadow-inner relative overflow-hidden group", botRunning ? "border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.25)] scale-105" : "border-white/10")}>
                  {botRunning && <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />}
                  <div className="relative z-10">
                    <MemoBotIcon className={cn("w-12 h-12 transition-all", STATUS_COLORS[status])} />
                    {botRunning && (
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-black" 
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                    <Activity size={10} className={botRunning ? "text-primary" : "text-gray-500"} />
                    {t('coreOperationsEngine' as any)}
                    {botRunning && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <ShieldCheck size={8} className="text-primary" />
                        <span className="text-[8px] font-black text-primary">{t('aiGuardActive' as any)}</span>
                      </div>
                    )}
                  </div>
                  <div className={cn("text-5xl font-black italic tracking-tighter uppercase leading-none", STATUS_COLORS[status])}>
                    {t(status as any)}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                      <Zap size={8} className="text-primary" />
                      {t('latency' as any)}: {f('42ms')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Mic className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{t('voiceControl' as any)}</p>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">{t('executeViaSpeech' as any)}</p>
                  </div>
                </div>
                <Switch 
                  checked={!!bot?.voiceEnabled} 
                  onCheckedChange={(val) => {
                    updateMutation.mutate({ voiceEnabled: val });
                    if(val) toast.success(t('voiceRecognitionInitialized' as any) || "Voice recognition initialized");
                  }} 
                />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{t('notifications' as any)}</p>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">{t('signalAlertsActive' as any)}</p>
                  </div>
                </div>
                <Switch 
                  checked={!!bot?.notificationEnabled} 
                  onCheckedChange={(val) => updateMutation.mutate({ notificationEnabled: val })} 
                />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group col-span-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                    botRunning ? "bg-rose-500/10 border-rose-500/20" : "bg-gray-500/10 border-gray-500/20"
                  )}>
                    <Activity className={cn("w-4 h-4", botRunning ? "text-rose-500" : "text-gray-500")} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                      {botRunning ? "Real Trading Engine Active" : "System Inactive"}
                    </p>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">
                      {botRunning ? "LIVE CAPITAL AT RISK" : "BOT IS CURRENTLY STOPPED"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={cn("px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest", botRunning ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-gray-500/10 border-gray-500/20 text-gray-500")}>
                    {botRunning ? "ON" : "OFF"}
                  </div>
                  <Switch 
                    checked={botRunning} 
                    onCheckedChange={async (val) => {
                      if (val) {
                        toast("Enabling REAL trading mode...");
                        controlMut.mutate({ action: "start", mode: "real" });
                      } else {
                        controlMut.mutate({ action: "stop", mode: "real" });
                      }
                    }}
                  />
                </div>
              </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-black/80 border border-white/5 rounded-2xl p-8 h-[500px] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="absolute inset-0 bg-blue-500/5 opacity-10 pointer-events-none" />
            <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                 <Terminal className="w-4 h-4 text-primary" />
                 <span>{t('transactionIntelligenceMonitor' as any)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{t('liveSequenceSync' as any)}</span>
              </div>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] relative z-10 custom-scrollbar pr-4">
              {logs?.map((log: any) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id} 
                  className="flex gap-4 text-primary/90 group hover:bg-white/[0.03] py-2 px-3 rounded-lg transition-all border border-transparent hover:border-white/5"
                >
                  <span className="text-gray-600 border-r border-white/10 pr-4 shrink-0 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <div className="flex-1">
                    <span className={cn(
                      "font-black tracking-tight", 
                      log.message.includes('[LIVE') ? 'text-emerald-400' :
                      log.message.includes('[PAPER') ? 'text-amber-500' :
                      log.level === 'error' ? 'text-rose-500' : 
                      'text-primary'
                    )}>
                      {log.message}
                    </span>
                    <div className="text-[9px] text-gray-600 mt-1 uppercase tracking-tighter">{t('executionId' as any)}: {(log.id * 1337).toString(16).toUpperCase()}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ControlBtn onClick={() => {
           if (uiMode === 'real') {
             toast("Starting REAL trading bot...");
           }
           controlMut.mutate({ action: "start", mode: uiMode || 'paper', symbol: 'BTC/USDT' });
        }} disabled={status === "running"} icon={<Play />} label={t("startBot")} variant="success" active={botRunning} />
        <ControlBtn onClick={() => controlMut.mutate({ action: "stop", mode: uiMode || 'paper' })} disabled={status === "stopped"} icon={<Square />} label={t("stopBot")} variant="danger" />
        <ControlBtn onClick={() => controlMut.mutate({ action: "pause", mode: uiMode || 'paper' })} disabled={status !== "running"} icon={<Pause />} label={t("pauseBot")} variant="warning" />
        <ControlBtn onClick={() => controlMut.mutate({ action: "restart", mode: uiMode || 'paper', symbol: 'BTC/USDT' })} icon={<RotateCcw />} label={t("restartBot")} variant="primary" />
      </div>

      <div className="bg-black/60 border border-white/5 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Trading Activities Log
        </h3>
        <div className="h-[300px] overflow-y-auto space-y-2 font-mono text-[11px] custom-scrollbar pr-2">
          {logs?.map((log: any) => (
            <div key={log.id} className="flex gap-4 text-primary/90 bg-white/[0.02] p-2 rounded border border-white/5 items-center">
               <span className="text-gray-500 min-w-[80px]">
                 {new Date(log.timestamp).toLocaleTimeString()}
               </span>
               <span className={cn(
                  "font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[9px]",
                  log.message.includes("BUY") || log.message.includes("LONG") ? 'bg-emerald-500/20 text-primary' :
                  log.message.includes("SELL") || log.message.includes("EXIT") ? 'bg-amber-500/20 text-primary' :
                  log.level === 'error' ? 'bg-rose-500/20 text-primary' :
                  'bg-blue-500/20 text-primary'
               )}>
                 {log.level === 'error' ? 'ERROR' : log.message.split(' ')[0]}
               </span>
               <span className="flex-1 opacity-90">
                 {log.message.includes('[LIVE') ? (
                    <span className="text-emerald-400 font-bold">{log.message}</span>
                 ) : log.message.includes('[PAPER') ? (
                    <span className="text-amber-500 font-bold">{log.message}</span>
                 ) : log.message}
               </span>
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <div className="text-center text-gray-500 pt-8 uppercase tracking-widest text-[10px]">
               No recent trading activities
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ icon, label, onClick, disabled, variant, active }: any) {
  const styles = {
    success: "bg-emerald-500/10 border-emerald-500/20 text-primary hover:bg-emerald-500/20",
    danger: "bg-rose-500/10 border-rose-500/20 text-primary hover:bg-rose-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20",
    primary: "bg-blue-600/10 border-blue-500/20 text-primary hover:bg-blue-600/20"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={cn("flex flex-col items-center justify-center gap-3 border rounded-2xl p-6 transition-all disabled:opacity-30 group shadow-md", styles[variant as keyof typeof styles], active && "shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-105 border-emerald-500/40")}>
      <div className="transition-transform group-hover:scale-110 group-active:scale-95">{React.cloneElement(icon, { size: 28 })}</div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}