import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DollarSign, Target, Gauge, Percent, TrendingDown, Zap } from "lucide-react";

const PERIODS = [
  { id: "daily", label: "24H" },
  { id: "weekly", label: "7D" },
  { id: "monthly", label: "30D" },
  { id: "all", label: "All" },
];

export default function Analytics() {
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/analytics?period=${period}`).then(({ data }) => setData(data));
  }, [period]);

  return (
    <Layout>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">performance</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase">Analytics</h1>
        </div>
        <div className="flex gap-1" data-testid="analytics-period-switch">
          {PERIODS.map((p) => (
            <button key={p.id} data-testid={`period-${p.id}`} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest border ${
                period === p.id ? "bg-[#007AFF] border-[#007AFF]" : "border-white/10 hover:border-white/30"
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="text-white/40 font-mono text-sm">loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat testid="analytics-total-pnl" label="Total PnL" icon={<DollarSign size={12} />}
                  value={`$${data.total_pnl.toFixed(2)}`} tone={data.total_pnl >= 0 ? "up" : "down"} />
            <Stat testid="analytics-sharpe" label="Sharpe" icon={<Gauge size={12} />} value={data.sharpe} />
            <Stat testid="analytics-profit-factor" label="Profit Factor" icon={<Target size={12} />} value={data.profit_factor} />
            <Stat testid="analytics-win-rate" label="Win Rate" icon={<Percent size={12} />} value={`${data.win_rate.toFixed(1)}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <Stat testid="analytics-avg-daily" label="Avg Daily PnL" icon={<Zap size={12} />}
                  value={`$${data.avg_daily_pnl.toFixed(2)}`} tone={data.avg_daily_pnl >= 0 ? "up" : "down"} />
            <Stat testid="analytics-volume" label="Volume" icon={<DollarSign size={12} />}
                  value={`$${data.total_volume.toLocaleString()}`} />
            <Stat testid="analytics-drawdown" label="Max Drawdown" icon={<TrendingDown size={12} />}
                  value={`${data.max_drawdown_pct}%`} tone="down" />
          </div>

          <div className="border border-white/10 bg-[#121212] p-5 mb-4" data-testid="cumulative-chart">
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">equity curve</div>
            <h2 className="font-display text-xl font-bold tracking-tight mb-3">Cumulative PnL</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.cumulative_pnl.length ? data.cumulative_pnl : [{ date: "start", value: 0 }]}>
                  <defs>
                    <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007AFF" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#007AFF" fill="url(#gg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-white/10 bg-[#121212] p-5" data-testid="by-strategy-chart">
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">attribution</div>
            <h2 className="font-display text-xl font-bold tracking-tight mb-3">Profit by strategy</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.profit_by_strategy.length ? data.profit_by_strategy : [{ strategy: "No trades", pnl: 0 }]}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }} />
                  <Bar dataKey="pnl" fill="#007AFF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function Stat({ label, icon, value, tone, testid }) {
  const cls = tone === "up" ? "text-[#34C759]" : tone === "down" ? "text-[#FF3B30]" : "text-white";
  return (
    <div data-testid={testid} className="border border-white/10 bg-[#121212] p-4">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
        {icon} {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-black tracking-tight ${cls}`}>{value}</div>
    </div>
  );
}
