import React from "react";
import { MemoBotIcon } from "../components/MemoBotIcon";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import { TradingActionsPanel } from "../components/TradingActionsPanel";
import { Search, Wallet, TrendingUp, Activity, Bot } from "lucide-react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

function StatCard({ label, value, sub, icon: Icon, color = "text-primary", noData = false }: { label: string; value: string; sub?: string; icon: any; color?: string; noData?: boolean }) {
  const { f } = useLanguage();
  return (
    <div className="bg-[#050505]/80 backdrop-blur-md border border-[var(--primary)]/10 rounded-xl p-5 space-y-3 shadow-lg group hover:border-[var(--primary)]/30 transition-all text-primary">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{label}</span>
        <div className={cn("p-2 rounded-lg bg-slate-900/50 border border-slate-800 transition-colors", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold price-display transition-colors">{noData ? "0.00" : f(value)}</div>
      {sub && <div className="text-[10px] text-gray-500 font-mono">{f(sub)}</div>}
    </div>
  );
}

export default function ManualTrading({ mode = 'real' }: { mode?: 'real' | 'paper' }) {
  const { t, f } = useLanguage();
  const { user } = useAuth() as any;
  const { settings } = useSettings();
  const isLive = mode === 'real';
  const { data: realBalanceData } = trpc.trading.getRealBalance.useQuery(
    { apiKey: settings.exchange.binanceApiKey, apiSecret: settings.exchange.binanceApiSecret },
    { enabled: !!settings.exchange.binanceApiKey && isLive }
  );
  const { data: positions } = trpc.trading.positions.useQuery({ mode: isLive ? 'real' : 'paper' });
  let balance = isLive ? parseFloat(user?.liveBalance || "0") : parseFloat(user?.paperBalance || "100000");
  
  if (isLive && settings.exchange.binanceApiKey) {
      if (realBalanceData?.success) {
         balance = realBalanceData.balance;
      } else {
         balance = 0;
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isLive ? "bg-rose-600/10 border border-rose-500/20" : "bg-blue-600/10 border border-blue-500/20")}>
            <Search className={cn("w-5 h-5", isLive ? "text-primary" : "text-primary")} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary italic tracking-tight">{isLive ? t("youTrade" as any) : t("paperTrading" as any)}</h1>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest", isLive ? "text-primary" : "text-primary")}>
               {isLive ? "Live Manual Execution Terminal" : "Paper Execution Terminal"}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label={isLive ? t("accountBalance") : t("paperBalance")} 
          value={`${balance.toLocaleString()} USDT`} 
          sub={isLive ? t("realUsdt" as any) : t("demoUsdt" as any)} 
          icon={Wallet} 
          color={isLive ? "text-primary" : "text-primary"}
        />
        <StatCard 
          label={t("totalPnL")} 
          value="+0.00 USDT" 
          sub="0.00%" 
          icon={TrendingUp} 
          color="text-gray-500"
          noData={false}
        />
        <StatCard 
          label={t("openPositions")} 
          value={String(positions?.length ?? 0)} 
          sub={`0 ${t("totalTrades")}`} 
          icon={Activity} 
          color="text-primary" 
        />
        <StatCard 
          label={t("botStatus")} 
          value="Stopped" 
          sub={`0 ${t('trades' as any)}`} 
          icon={MemoBotIcon} 
          color="text-gray-500" 
        />
      </div>

      <TradingActionsPanel mode={mode} />
    </div>
  );
}
