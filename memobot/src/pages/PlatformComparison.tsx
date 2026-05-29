import React from "react";
import { motion } from "motion/react";
import { Check, X, Shield, Zap, Brain, Globe, Infinity, Activity, TrendingUp, Cpu, Flame, Target } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const COMPETITORS = [
  { name: "3Commas", icon: "🤖" },
  { name: "Cryptohopper", icon: "🦘" },
  { name: "Pionex", icon: "📈" },
  { name: "TradingView", icon: "👁️" },
  { name: "HaasOnline", icon: "🦊" },
  { name: "MetaTrader 5", icon: "📊" },
  { name: "TradeStation", icon: "🚂" },
  { name: "NinjaTrader", icon: "🥷" },
  { name: "Interactive Brokers", icon: "💼" },
  { name: "eToro", icon: "🐂" }
];

const CRITERIA = [
  {
    category: "Execution Intelligence",
    items: [
      { key: "aiPredictive", label: "AI Predictive Analytics", ourScore: 10, icon: Brain, description: "Deep learning models for market direction forecasting" },
      { key: "hft", label: "HFT Capabilities", ourScore: 10, icon: Zap, description: "Sub-millisecond execution latency" },
      { key: "dynamicRouting", label: "Dynamic Smart Routing", ourScore: 9, icon: Activity, description: "Routing across multiple liquidity pools" },
    ]
  },
  {
    category: "Strategy & Automation",
    items: [
      { key: "visualBuilder", label: "No-Code Visual Builder", ourScore: 10, icon: Target, description: "Drag and drop strategy creation" },
      { key: "backtesting", label: "Tick-level Backtesting", ourScore: 10, icon: TrendingUp, description: "High-precision historical testing" },
      { key: "multiAsset", label: "Multi-Asset Automation", ourScore: 8, icon: Globe, description: "Crypto, Forex, and Stocks" },
    ]
  },
  {
    category: "Risk Management",
    items: [
      { key: "autoHedging", label: "Auto-Hedging", ourScore: 9, icon: Shield, description: "Automatic delta-neutral balancing" },
      { key: "drawdownControl", label: "Max Drawdown Halt", ourScore: 10, icon: Flame, description: "Hard-stop on severe account drawdown" },
      { key: "portfolioMargin", label: "Cross-Portfolio Margin", ourScore: 8, icon: Infinity, description: "Advanced margin utilization" },
    ]
  }
];

const COMPETITOR_SCORES: Record<string, Record<string, number>> = {
  "3Commas": { aiPredictive: 3, hft: 4, dynamicRouting: 5, visualBuilder: 7, backtesting: 4, multiAsset: 2, autoHedging: 2, drawdownControl: 6, portfolioMargin: 4 },
  "Cryptohopper": { aiPredictive: 4, hft: 3, dynamicRouting: 4, visualBuilder: 8, backtesting: 5, multiAsset: 2, autoHedging: 2, drawdownControl: 7, portfolioMargin: 3 },
  "Pionex": { aiPredictive: 2, hft: 6, dynamicRouting: 6, visualBuilder: 3, backtesting: 3, multiAsset: 1, autoHedging: 2, drawdownControl: 5, portfolioMargin: 2 },
  "TradingView": { aiPredictive: 5, hft: 1, dynamicRouting: 1, visualBuilder: 2, backtesting: 9, multiAsset: 10, autoHedging: 1, drawdownControl: 3, portfolioMargin: 1 },
  "HaasOnline": { aiPredictive: 3, hft: 7, dynamicRouting: 6, visualBuilder: 7, backtesting: 8, multiAsset: 4, autoHedging: 6, drawdownControl: 8, portfolioMargin: 5 },
  "MetaTrader 5": { aiPredictive: 2, hft: 8, dynamicRouting: 4, visualBuilder: 2, backtesting: 8, multiAsset: 10, autoHedging: 5, drawdownControl: 8, portfolioMargin: 6 },
  "TradeStation": { aiPredictive: 3, hft: 8, dynamicRouting: 7, visualBuilder: 4, backtesting: 9, multiAsset: 9, autoHedging: 4, drawdownControl: 8, portfolioMargin: 7 },
  "NinjaTrader": { aiPredictive: 2, hft: 9, dynamicRouting: 6, visualBuilder: 3, backtesting: 9, multiAsset: 8, autoHedging: 4, drawdownControl: 7, portfolioMargin: 6 },
  "Interactive Brokers": { aiPredictive: 4, hft: 9, dynamicRouting: 10, visualBuilder: 1, backtesting: 6, multiAsset: 10, autoHedging: 8, drawdownControl: 9, portfolioMargin: 10 },
  "eToro": { aiPredictive: 2, hft: 2, dynamicRouting: 3, visualBuilder: 1, backtesting: 1, multiAsset: 8, autoHedging: 1, drawdownControl: 6, portfolioMargin: 2 }
};

function ScoreBadge({ score }: { score: number }) {
  let color = "text-red-400 bg-red-400/10 border-red-400/20";
  if (score >= 8) color = "text-primary bg-emerald-400/10 border-emerald-400/20";
  else if (score >= 5) color = "text-primary bg-amber-400/10 border-amber-400/20";

  return (
    <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${color} flex items-center justify-center min-w-[32px]`}>
      {score}/10
    </div>
  );
}

export default function PlatformComparison() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary italic tracking-tight uppercase">Global Market Standing</h1>
          <p className="text-xs text-gray-400 font-mono">Vs. Top 10 Automated Trading Platforms</p>
        </div>
      </div>

      <div className="bg-[#050505]/80 backdrop-blur-md rounded-2xl border border-[var(--primary)]/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-white/5 bg-[#050505] sticky left-0 z-30 w-[300px] min-w-[300px] max-w-[300px] shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                  <div className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Evaluation Criteria</div>
                </th>
                <th className="p-4 border-b border-white/5 bg-[#0a1526] text-center w-[160px] min-w-[160px] max-w-[160px] sticky left-[300px] z-30 border-x border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-primary font-bold italic tracking-wider text-xl leading-none">MEMOBOT</div>
                    <div className="text-[10px] text-gray-400 font-mono">PRO VERSION</div>
                  </div>
                </th>
                {COMPETITORS.map((comp) => (
                  <th key={comp.name} className="p-4 border-b border-l border-white/5 bg-white/[0.02] text-center min-w-[120px]">
                    <div className="text-xl mb-1">{comp.icon}</div>
                    <div className="text-[10px] font-bold text-primary/90 uppercase tracking-wider">{comp.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRITERIA.map((category, catIdx) => (
                <React.Fragment key={category.category}>
                  {/* Category Header */}
                  <tr>
                    <td colSpan={COMPETITORS.length + 2} className="p-3 bg-white/[0.05] border-y border-white/10 relative z-0">
                      <h3 className="text-xs font-bold text-primary tracking-widest uppercase">{category.category}</h3>
                    </td>
                  </tr>
                  
                  {/* Category Items */}
                  {category.items.map((item, itemIdx) => (
                    <motion.tr 
                      key={item.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (catIdx * 3 + itemIdx) * 0.05 }}
                      className="group hover:bg-white/[0.02]"
                    >
                      <td className="p-4 border-b border-white/5 sticky left-0 z-20 bg-[#050505] w-[300px] min-w-[300px] max-w-[300px] shadow-[4px_0_10px_rgba(0,0,0,0.5)] group-hover:bg-[#0a0a0a] transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-slate-800/50 text-gray-400 mt-0.5">
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-primary">{item.label}</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-1">{item.description}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Our Score */}
                      <td className="p-4 border-b border-white/5 bg-[#0a1526] group-hover:bg-blue-900/30 text-center sticky left-[300px] z-20 border-x border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.3)] transition-colors w-[160px] min-w-[160px] max-w-[160px]">
                        <div className="flex justify-center">
                          <div className="px-3 py-1 rounded border border-blue-500/40 bg-blue-500/20 text-blue-300 font-black text-sm shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                            {item.ourScore}/10
                          </div>
                        </div>
                      </td>
                      
                      {/* Competitor Scores */}
                      {COMPETITORS.map((comp) => {
                        const score = COMPETITOR_SCORES[comp.name][item.key];
                        return (
                          <td key={comp.name} className="p-4 border-b border-l border-white/5 text-center">
                            <div className="flex justify-center">
                              <ScoreBadge score={score} />
                            </div>
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
              
              {/* Overall Score Row */}
              <tr>
                <td className="p-6 border-t border-white/10 sticky left-0 z-20 bg-[#050505] w-[300px] min-w-[300px] max-w-[300px] shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                  <div className="text-sm font-black text-primary tracking-widest uppercase">Overall System Rating</div>
                </td>
                <td className="p-6 border-t border-white/10 text-center sticky left-[300px] z-20 bg-[#0a1526] border-x border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.3)] w-[160px] min-w-[160px] max-w-[160px]">
                  <div className="text-2xl font-black text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">9.6</div>
                </td>
                {COMPETITORS.map((comp) => {
                  const scores = Object.values(COMPETITOR_SCORES[comp.name]);
                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                  
                  return (
                    <td key={comp.name} className="p-6 border-t border-l border-white/10 text-center">
                      <div className="text-lg font-bold text-primary/90">{avg.toFixed(1)}</div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
