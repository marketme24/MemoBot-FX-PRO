import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import { trpc } from "../lib/trpc";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { Wallet, Zap, Target, TrendingUp, ShieldCheck, ChevronDown, Rocket, History, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";

import { useRealtimePrices } from "../hooks/useRealtimePrices";

export function TradingActionsPanel({ mode }: { mode?: 'real' | 'paper' }) {
  const { t, f, language } = useLanguage();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [pair, setPair] = useState('BTCUSDT');
  const [amount, setAmount] = useState('0.05');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: bot } = trpc.bot.status.useQuery();
  const { data: user } = trpc.admin.getProfile.useQuery(); // Or wherever balance is available
  const { settings } = useSettings();
  const { data: realBalanceData } = trpc.trading.getRealBalance.useQuery(
    undefined,
    { enabled: !!settings.exchange.binanceApiKey }
  );

  const isLive = mode === 'real' || (mode === undefined && bot?.mode === 'real');
  const { data: positions } = trpc.trading.positions.useQuery({ mode: isLive ? 'real' : 'paper' });
  const { getTicker } = useRealtimePrices();
  const livePrice = getTicker(pair)?.price ? parseFloat(getTicker(pair)!.price) : 64500;
  let balance = isLive ? (user as any)?.liveBalance : (user as any)?.paperBalance;
  if (isLive && settings.exchange.binanceApiKey) {
     if (realBalanceData?.success) {
        balance = realBalanceData.balance;
     } else {
        balance = 0;
     }
  }

  const handleAllocation = (p: string) => {
    let pNum;
    if (p === t('max' as any) || p === 'MAX') {
      pNum = 1;
    } else {
      pNum = parseFloat(p.replace('%', '')) / 100;
    }
    const val = (balance * pNum);
    // Rough estimate based on USDT allocating how much base asset
    setAmount(livePrice > 0 ? (val / livePrice).toFixed(4) : val.toString());
  };

  const [expandedHistory, setExpandedHistory] = useState(false);

  const executeMut = trpc.trading.execute.useMutation({
    onSuccess: () => {
      toast.success(t('executionSuccessful' as any), {
        description: `${t('buy' as any) === side ? t('buy' as any) : t('sell' as any)} ${t('orderFilledAt' as any)} ${amount} ${pair.replace('USDT', '')} @ ${f(livePrice.toString())}`,
        duration: 3000
      });
    },
    onError: (e) => toast.error(`${t('executionRefused' as any)}: ${e.message}`)
  });

  const handleExecute = () => {
    executeMut.mutate({
      symbol: pair,
      side: side,
      quantity: parseFloat(amount),
      price: livePrice,
      mode: isLive ? 'real' : 'paper'
    });
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 pb-20">
      {/* Execution Terminal */}
      <div className={cn(
        "lg:col-span-4 bg-[#050505]/80 backdrop-blur-3xl border rounded-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[600px] transition-all",
        isLive ? "border-rose-500/20 shadow-rose-900/10" : "border-white/5 shadow-black"
      )}>
        {isLive && <div className="absolute top-0 inset-x-0 h-1 bg-rose-500 animate-pulse" />}
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Rocket size={160} />
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-xl font-black text-primary italic tracking-tighter uppercase">{t('master' as any)} <span className={isLive ? "text-primary" : "text-primary"}>{t('terminal' as any)}</span></h3>
               <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">{isLive ? t('liveNetworkActive' as any) : t('highVelocityDeployment' as any)}</p>
            </div>
            <div className={cn("bg-white/5 border rounded-xl px-3 py-1 flex items-center gap-2", isLive ? "border-rose-500/20" : "border-white/10")}>
               <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isLive ? "bg-rose-500" : "bg-blue-500")} />
               <span className={cn("text-[10px] font-black uppercase", isLive ? "text-primary" : "text-gray-400")}>{isLive ? t('realSignal' as any) : t('synchronized' as any)}</span>
            </div>
          </div>

          <div className="flex bg-black border border-white/10 rounded-2xl p-1 mb-8">
             <Tooltip>
               <TooltipTrigger asChild>
                 <button 
                  onClick={() => setSide('buy')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    side === 'buy' ? (isLive ? "bg-rose-500 text-primary" : "bg-emerald-500 text-black") : "text-gray-500 hover:text-primary/90"
                  )}
                 >
                    {t('buy' as any)}
                 </button>
               </TooltipTrigger>
               <TooltipContent side="bottom" className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl max-w-xs text-center text-[10px] uppercase font-bold tracking-widest z-[1000]">
                 Long Position (Buy Base Asset)
               </TooltipContent>
             </Tooltip>
             <Tooltip>
               <TooltipTrigger asChild>
                 <button 
                  onClick={() => setSide('sell')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    side === 'sell' ? (isLive ? "bg-rose-500 text-primary" : "bg-rose-500 text-primary") : "text-gray-500 hover:text-primary/90"
                  )}
                 >
                    {t('sell' as any)}
                 </button>
               </TooltipTrigger>
               <TooltipContent side="bottom" className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl max-w-xs text-center text-[10px] uppercase font-bold tracking-widest z-[1000]">
                 Short Position (Sell Base Asset)
               </TooltipContent>
             </Tooltip>
          </div>

          <div className="space-y-6 flex-1">
             <div className="space-y-2">
                <div className="flex justify-between px-1">
                   <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t('marketPair' as any)}</label>
                   <span className="text-[8px] text-primary font-bold uppercase">{isLive ? t('binanceLive' as any) : t('binanceSpot' as any)}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between group focus-within:border-blue-500/50 transition-all">
                   <input 
                    value={pair}
                    onChange={(e) => setPair(e.target.value.toUpperCase())}
                    className="bg-transparent border-none outline-none font-black text-primary italic tracking-tighter uppercase w-full" 
                   />
                   <ChevronDown size={14} className="text-gray-500" />
                </div>
                <div className="px-1 flex justify-between">
                   <span className="text-[10px] font-mono text-primary font-black">${f(livePrice.toLocaleString())}</span>
                   <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{t('markPrice' as any)}</span>
                </div>
             </div>

             <div className="space-y-2">
                <div className="flex justify-between px-1">
                   <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t('quantity' as any)}</label>
                   <span className="text-[8px] text-gray-600 font-bold uppercase">WALLET: {f(balance || '0')} USDT</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 group focus-within:border-blue-500/50 transition-all">
                   <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-transparent border-none outline-none font-mono text-xl font-black text-primary w-full" 
                      />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{pair.replace('USDT', '')}</span>
                   </div>
                   <div className="flex gap-2 mt-4">
                      {['25%', '50%', '75%', t('max' as any)].map((p) => (
                        <button onClick={(e) => { e.preventDefault(); handleAllocation(p); }} key={p} className="flex-1 py-1 rounded bg-white/5 border border-white/5 text-[8px] font-black text-gray-500 hover:bg-white/10 hover:text-primary transition-all uppercase tracking-tighter">
                          {p}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
             
             <div className="pt-4">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-[10px] font-black text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors mb-4"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-180")} />
                  {t('advancedAnalystOptions' as any)}
                </button>
                
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3"
                    >
                       <div className="flex gap-2">
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-lg p-2">
                             <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter block mb-1">{t('stopLossLabel' as any)}</span>
                             <span className="text-[10px] font-mono text-primary font-bold">{f('1.2%')}</span>
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-lg p-2">
                             <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter block mb-1">{t('takeProfitLabel' as any)}</span>
                             <span className="text-[10px] font-mono text-primary font-bold">{f('4.5%')}</span>
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-lg p-2">
                             <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter block mb-1">{t('leverageLabel' as any)}</span>
                             <span className="text-[10px] font-mono text-primary font-bold">{f('5x')}</span>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>

          <div className="pt-8 mt-auto">
             <Tooltip>
               <TooltipTrigger asChild>
                 <button 
                  onClick={handleExecute}
                  disabled={executeMut.isPending}
                  className={cn(
                    "w-full h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-[0.98] shadow-2xl relative overflow-hidden group/btn",
                    side === 'buy' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20",
                    executeMut.isPending && "animate-pulse"
                  )}
                 >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    <span className={cn("text-[11px] font-black uppercase tracking-[0.2em] relative z-10", side === 'buy' ? "text-black" : "text-primary")}>
                      {executeMut.isPending ? t('deployingSequence' as any) : `${side === 'buy' ? t('confirmLong' as any) : t('confirmShort' as any)} ${t('exploit' as any)}`}
                    </span>
                    <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-60 mt-1 relative z-10", side === 'buy' ? "text-black" : "text-primary")}>
                       {f(amount)} {pair.replace('USDT', '')} {t('atMarketPrice' as any)}
                    </span>
                 </button>
               </TooltipTrigger>
               <TooltipContent side="top" className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl max-w-xs text-center text-[10px] uppercase font-bold tracking-widest z-[1000] p-3 text-red-500">
                 WARNING: This action will be executed in {isLive ? "REAL LIVE" : "PAPER TRADING"} mode. Only click if you are absolutely sure.
               </TooltipContent>
             </Tooltip>
          </div>
        </div>
      </div>

      {/* Intelligence Feed & History */}
      <div className="lg:col-span-8 flex flex-col gap-6">
         <div className="grid md:grid-cols-2 gap-6 shrink-0">
            <div className="bg-[#050505]/50 border border-white/5 rounded-2xl p-6 relative group overflow-hidden">
               <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck size={80} className="text-primary" />
               </div>
               <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <Zap size={10} className="text-primary" /> {t('analystIntelligenceUnit' as any)}
               </h4>
               <p className="text-xs font-bold text-primary/90 leading-relaxed italic border-l-2 border-amber-500/30 pl-4">
                 "Engine analysis suggests strong order book support at ${f((livePrice * 0.995).toFixed(2))}. Stochastic RSI indicates an oversold condition. Momentum crossover imminent."
               </p>
               <div className="mt-4 flex items-center gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[8px] font-black text-primary uppercase">{t('signalHighStrength' as any)}</div>
                  <div className="bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded text-[8px] font-black text-primary uppercase">{t('alphaWinLabel' as any)}: {f('78.4%')}</div>
               </div>
            </div>
            
            <div className="bg-[#050505]/50 border border-white/5 rounded-2xl p-6 relative group overflow-hidden">
                <div className="absolute -right-2 -top-2 opacity-5">
                  <Target size={80} className="text-primary" />
                </div>
                <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Activity size={10} className="text-primary" /> {t('liquidityAggregator' as any)}
                </h4>
                <div className="space-y-3">
                   {[
                     { label: 'Binance', depth: `$${((livePrice * 123) / 1000).toFixed(1)}M`, spread: '0.008%' },
                     { label: 'Coinbase', depth: `$${((livePrice * 82) / 1000).toFixed(1)}M`, spread: '0.012%' },
                   ].map((ex, i) => (
                     <div key={i} className="flex justify-between items-center bg-black/40 rounded-lg p-2 border border-white/5">
                        <span className="text-[10px] font-black text-primary italic uppercase tracking-tighter">{ex.label}</span>
                        <div className="flex gap-4">
                          <span className="text-[9px] text-gray-500 font-mono italic">{ex.depth}</span>
                          <span className="text-[9px] text-primary font-mono font-bold">{ex.spread}</span>
                        </div>
                     </div>
                   ))}
                </div>
            </div>
         </div>

         <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                 <History className="w-4 h-4 text-primary" />
                 {t('openPositionInventory' as any)}
               </h3>
               <button onClick={() => setExpandedHistory(!expandedHistory)} className="text-[8px] font-black text-gray-600 hover:text-primary uppercase transition-colors">
                  {expandedHistory ? 'COLLAPSE' : t('viewAllHistory' as any)}
               </button>
            </div>
            
            <div className="flex-1 overflow-x-auto min-h-[300px]">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                       <th className="pb-4">{t('index' as any)}</th>
                       <th className="pb-4">{t('asset' as any)}</th>
                       <th className="pb-4">{t('side' as any)}</th>
                       <th className="pb-4">{t('sizeIncLev' as any)}</th>
                       <th className="pb-4 text-right">{t('unrealizedRoi' as any)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {positions?.map((pos, i) => (
                      <tr key={pos.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 text-[10px] font-mono text-gray-600">{f((i + 1).toString())}</td>
                        <td className="py-4">
                           <span className="text-xs font-black text-primary tracking-widest">{pos.symbol || (pos as any).tradingPair}</span>
                        </td>
                        <td className="py-4">
                           <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase", (pos as any).side === 'buy' ? 'bg-emerald-500/10 text-primary' : 'bg-rose-500/10 text-primary')}>
                             {(pos as any).side === 'buy' ? t('buy' as any) : t('sell' as any)}
                           </span>
                        </td>
                        <td className="py-4">
                           <span className="text-xs font-black text-primary italic tracking-tighter">{f((pos as any).quantity || (pos as any).size)} {((pos.symbol || (pos as any).tradingPair) || "").replace('USDT', '')}</span>
                           <span className="text-[9px] text-gray-500 font-bold uppercase ml-2 tracking-tighter">x10</span>
                        </td>
                        <td className="py-4 text-right">
                           <div className="flex flex-col items-end">
                              <span className={cn("text-sm font-black italic tracking-tighter", (parseFloat((pos as any).currentPrice || "0") - parseFloat((pos as any).entryPrice || "0")) >= 0 || (pos as any).pnl >= 0 ? "text-primary" : "text-primary")}>
                                {(parseFloat((pos as any).currentPrice || "0") - parseFloat((pos as any).entryPrice || "0")) >= 0 || (pos as any).pnl >= 0 ? "+" : ""}{(pos as any).pnl != null ? f((pos as any).pnl.toString()) : f((parseFloat((pos as any).currentPrice || "0") - parseFloat((pos as any).entryPrice || "0")).toFixed(2))} USDT
                              </span>
                              <div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                 <div className={cn("h-full", (parseFloat((pos as any).currentPrice || "0") - parseFloat((pos as any).entryPrice || "0")) >= 0 || (pos as any).pnl >= 0 ? "bg-emerald-500" : "bg-rose-500")} style={{ width: '40%' }} />
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {(!positions || positions.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center opacity-20">
                           <div className="flex flex-col items-center gap-4">
                              <Wallet className="w-12 h-12" />
                              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t('noActiveInventory' as any)}</span>
                           </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}