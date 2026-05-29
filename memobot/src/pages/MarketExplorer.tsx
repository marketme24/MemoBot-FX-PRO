import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from '../components/ui/card';
import { Globe, TrendingUp, BarChart, Zap, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useRealtimePrices } from '../hooks/useRealtimePrices';
import { toast } from 'sonner';

export default function MarketExplorer() {
  const { tickers } = useRealtimePrices();
  const { t, f, language } = useLanguage();
  const [activeChart, setActiveChart] = React.useState<string | null>(null);

  const sortedTickers = [...(tickers as any[])].sort((a, b) => parseFloat(b.volume || "0") - parseFloat(a.volume || "0"));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary italic tracking-tighter uppercase">{t('market')}</h1>
        </div>
      </div>

      <Card className="bg-[#050505]/60 backdrop-blur-3xl border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 backdrop-blur-md">
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-48">{t('marketPair')}</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('executionPrice' as any)}</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('delta24h' as any)}</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('upperBound' as any)}</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('lowerBound' as any)}</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('tradeVolume' as any)}</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">{t('engineChart' as any)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTickers?.map((ticker, idx) => (
                <motion.tr 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/[0.04] group transition-all cursor-pointer relative"
                >
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] font-black text-primary border border-blue-500/20 group-hover:scale-110 transition-transform">
                         {ticker.symbol.charAt(0)}
                       </div>
                       <div className="flex flex-col">
                         <span className="text-sm font-black text-primary tracking-tight">{ticker.symbol.replace("USDT", "")}</span>
                         <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">{t('binanceSpot' as any)}</span>
                       </div>
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <span className="font-mono text-sm font-black text-primary bg-white/5 px-2 py-1 rounded border border-white/5">
                      ${f(parseFloat(ticker.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                    </span>
                  </td>
                  <td className="p-5 text-right font-mono text-sm font-black">
                    <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded", ticker.change24h.startsWith("+") ? "bg-emerald-500/10 text-primary" : "bg-rose-500/10 text-primary")}>
                      {ticker.change24h.startsWith("+") ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                      {f(ticker.change24h)}{f('%')}
                    </div>
                  </td>
                  <td className="p-5 text-right font-mono text-[11px] text-gray-400 font-bold">
                    ${f(parseFloat(ticker.high || "0").toLocaleString())}
                  </td>
                  <td className="p-5 text-right font-mono text-[11px] text-gray-400 font-bold">
                    ${f(parseFloat(ticker.low || "0").toLocaleString())}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-[11px] text-primary font-black">{f(ticker.volume)}</span>
                      <div className="w-12 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-blue-500 w-[60%]" />
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center justify-center gap-4">
                       <div className="w-20 h-8 flex items-end gap-1">
                          {[40, 70, 45, 90, 65, 80, 55, 60, 45, 80].map((h, i) => (
                            <div 
                              key={i} 
                              className={cn("flex-1 rounded-t-sm transition-all", ticker.change24h.startsWith("+") ? "bg-emerald-500/40" : "bg-rose-500/40", "group-hover:opacity-100 opacity-60")}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                       </div>
                       <button onClick={() => setActiveChart(activeChart === ticker.symbol ? null : ticker.symbol)} className={cn("p-2 rounded-lg border hover:border-blue-500 transition-all shadow-lg", activeChart === ticker.symbol ? "bg-blue-600 text-primary border-blue-500" : "bg-white/5 hover:bg-blue-600 text-gray-500 hover:text-primary border-white/5")}>
                         <ExternalLink className="w-4 h-4" />
                       </button>
                    </div>
                    {activeChart === ticker.symbol && (
                      <div className="absolute top-full left-0 right-0 z-50 p-4 border border-blue-500/30 bg-black/90 backdrop-blur-xl mt-2 rounded-xl shadow-2xl">
                         <div className="h-48 flex items-center justify-center font-mono text-gray-500 border border-white/5 bg-white/[0.02] rounded text-sm uppercase tracking-widest">
                           Render advanced {ticker.symbol} chart engine
                         </div>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('rsiMomentum' as any), value: (sortedTickers && sortedTickers.length > 0) ? (parseFloat(sortedTickers[0].price) % 100).toFixed(2) : "46.23", status: t('neutralZone' as any), icon: <TrendingUp className="w-3 h-3 text-primary" /> },
          { label: t('macdDivergence' as any), value: (sortedTickers && sortedTickers.length > 0) ? (parseFloat(sortedTickers[0].price) * 0.002).toFixed(4) : "143.3545", status: `${t('signalLabel' as any)}: ${f('Signal')}`, icon: <BarChart size={12} className="text-primary" /> },
          { label: t('bollingerCorridor' as any), value: (sortedTickers && sortedTickers.length > 0) ? `$${(parseFloat(sortedTickers[0].price) * 1.05).toFixed(2)}` : "$81,813.82", status: t('volatilityLow' as any), icon: <Globe className="w-3 h-3 text-purple-400" /> },
          { label: t('engineScore' as any), value: (sortedTickers && sortedTickers.length > 0) ? `${Math.floor(parseFloat(sortedTickers[0].price) % 100)}/100` : "41/100", status: t('accumulationPhase' as any), icon: <Zap className="w-3 h-3 text-primary" /> }
        ].map((stat, i) => (
          <Card key={i} className="bg-black/60 border border-white/5 p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">{stat.label}</p>
              <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-primary leading-none tracking-tighter truncate">
              {f(stat.value)}
            </p>
            <div className="flex items-center gap-2 mt-4">
               <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-600/40 w-[41%]" />
               </div>
               <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{stat.status}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}