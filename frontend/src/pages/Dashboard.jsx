import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { useBot } from "../context/BotContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { TrendingUp, Activity, DollarSign, Target, ExternalLink, Brain } from "lucide-react";
import { Link } from "react-router-dom";

const MASCOT_URL = "https://customer-assets.emergentagent.com/job_quant-execution-pro/artifacts/8mhx03q9_mascot.png";

export default function Dashboard() {
  const { bot, controlBot, tickers, notifications } = useBot();
  const { user } = useAuth();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState(null);
  const [opps, setOpps] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [a, o, t] = await Promise.all([
          api.get("/analytics?period=all"),
          api.get("/market/opportunities"),
          api.get("/trade/trades?limit=8"),
        ]);
        if (!alive) return;
        setAnalytics(a.data);
        setOpps(o.data);
        setRecentTrades(t.data);
      } catch (_) {}
    };
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const kpi = analytics || { total_pnl: 0, total_volume: 0, avg_daily_pnl: 0, profit_factor: 0, trade_count: 0, win_rate: 0, cumulative_pnl: [] };

  return (
    <Layout>
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">{t("dashboard_overline")} {user?.name}</div>
          <h1 data-testid="dashboard-title" className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase mt-1 bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] bg-clip-text text-transparent">
            {t("dashboard_title")}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StateBadge status={bot?.status} t={t} />
          <button
            data-testid="dashboard-engine-toggle"
            onClick={() => controlBot(bot?.status === "RUNNING" ? "stop" : "start")}
            className={`px-4 py-2 text-xs font-display font-bold uppercase tracking-widest transition-colors ${
              bot?.status === "RUNNING" ? "bg-[#FF3B30] hover:bg-[#FF3B30]/80" : "bg-[#34C759] hover:bg-[#34C759]/80"
            } text-white`}
          >
            {bot?.status === "RUNNING" ? t("stop_engine") : t("start_engine")}
          </button>
        </div>
      </div>

      {/* AI Co-pilot mascot strip */}
      <div className="mb-6 border border-white/10 bg-gradient-to-r from-[#0a1f3d] via-[#0a0a0a] to-[#1a0a1f] p-4 flex items-center gap-4 overflow-hidden" data-testid="copilot-card">
        <img src={MASCOT_URL} alt="Memo mascot" className="h-20 w-20 object-contain shrink-0 drop-shadow-[0_0_18px_rgba(0,200,255,0.4)]" />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase flex items-center gap-1">
            <Brain size={11} /> co-pilot
          </div>
          <div className="font-display text-lg sm:text-xl font-bold tracking-tight mt-0.5">{t("copilot_title")}</div>
          <div className="text-xs text-white/60 mt-0.5">{t("copilot_sub")}</div>
        </div>
        <Link to="/market" className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-[#FFD27D] hover:underline shrink-0">
          {t("view_details")}
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI testid="kpi-total-pnl" icon={<DollarSign size={14} />} label={t("kpi_total_pnl")} value={`$${kpi.total_pnl.toFixed(2)}`}
             tone={kpi.total_pnl >= 0 ? "up" : "down"} sub={`${kpi.trade_count} ${t("kpi_trades")}`} />
        <KPI testid="kpi-volume" icon={<Activity size={14} />} label={t("kpi_volume")} value={`$${(kpi.total_volume/1000).toFixed(1)}K`} sub={t("kpi_all_time")} />
        <KPI testid="kpi-avg-daily" icon={<TrendingUp size={14} />} label={t("kpi_avg_daily")} value={`$${kpi.avg_daily_pnl.toFixed(2)}`}
             tone={kpi.avg_daily_pnl >= 0 ? "up" : "down"} />
        <KPI testid="kpi-profit-factor" icon={<Target size={14} />} label={t("kpi_profit_factor")} value={kpi.profit_factor} sub={`${t("kpi_win")} ${kpi.win_rate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cumulative PnL chart */}
        <div className="lg:col-span-2 border border-white/10 bg-[#121212] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">performance</div>
              <h2 className="font-display text-xl font-bold tracking-tight">Cumulative PnL</h2>
            </div>
            <Link to="/analytics" className="text-[10px] font-mono uppercase tracking-widest text-[#007AFF] hover:underline">View details →</Link>
          </div>
          <div className="h-64" data-testid="pnl-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.cumulative_pnl.length ? kpi.cumulative_pnl : [{date:"start",value:0}]}>
                <defs>
                  <linearGradient id="gpn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(d)=>String(d).slice(5)} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                <Tooltip contentStyle={{background:"#121212", border:"1px solid rgba(255,255,255,0.1)", fontSize:12}} />
                <Area type="monotone" dataKey="value" stroke="#007AFF" fill="url(#gpn)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top opportunities */}
        <div className="border border-white/10 bg-[#121212] p-5">
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">top opportunities</div>
          <h2 className="font-display text-xl font-bold tracking-tight mb-4">Highest confluence</h2>
          <div className="space-y-2" data-testid="top-opportunities">
            {opps.map((o) => (
              <a key={o.symbol} href={o.binance_url} target="_blank" rel="noreferrer"
                 data-testid={`opp-${o.symbol}`}
                 className="flex items-center justify-between px-3 py-2 border border-white/5 hover:border-[#007AFF] transition-colors">
                <div>
                  <div className="font-display font-bold">{o.symbol}</div>
                  <div className="font-mono text-[10px] text-white/40">Score {o.score}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">${o.price.toLocaleString()}</div>
                  <div className={`font-mono text-[10px] ${o.change_24h_pct>=0?"text-[#34C759]":"text-[#FF3B30]"}`}>
                    {o.change_24h_pct >= 0 ? "+" : ""}{o.change_24h_pct.toFixed(2)}%
                  </div>
                </div>
                <ExternalLink size={12} className="text-white/30 ml-2" />
              </a>
            ))}
            {opps.length === 0 && <div className="text-xs text-white/40 font-mono">loading…</div>}
          </div>
        </div>

        {/* Recent trades */}
        <div className="lg:col-span-2 border border-white/10 bg-[#121212] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">execution log</div>
              <h2 className="font-display text-xl font-bold tracking-tight">Recent trades</h2>
            </div>
            <Link to="/trading" className="text-[10px] font-mono uppercase tracking-widest text-[#007AFF] hover:underline">Trade now →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="recent-trades-table">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10">
                  <th className="py-2">Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th className="text-right">PnL</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2 font-mono text-xs text-white/60">{new Date(t.created_at).toLocaleTimeString()}</td>
                    <td className="font-display font-bold">{t.trading_pair}</td>
                    <td className={`font-mono uppercase ${t.side==="buy"?"text-[#007AFF]":"text-[#FF3B30]"}`}>{t.side}</td>
                    <td className="font-mono">{t.quantity}</td>
                    <td className="font-mono">${Number(t.price).toFixed(2)}</td>
                    <td className={`text-right font-mono ${t.realized_pnl>=0?"text-[#34C759]":"text-[#FF3B30]"}`}>
                      {t.realized_pnl >= 0 ? "+" : ""}${Number(t.realized_pnl).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {recentTrades.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-white/40 font-mono text-xs">No trades yet — start the engine and execute your first order.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="border border-white/10 bg-[#121212] p-5">
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">activity feed</div>
          <h2 className="font-display text-xl font-bold tracking-tight mb-4">Notifications</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="notifications-list">
            {notifications.slice(0, 8).map((n) => (
              <div key={n.id} className="px-3 py-2 border-l-2 border-white/10 bg-white/[0.02]">
                <div className="text-xs">{n.title}</div>
                <div className="text-[10px] text-white/50 font-mono">{n.message}</div>
              </div>
            ))}
            {notifications.length === 0 && <div className="text-xs text-white/40 font-mono">no notifications</div>}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function KPI({ icon, label, value, sub, tone, testid }) {
  const toneClass = tone === "up" ? "text-[#34C759]" : tone === "down" ? "text-[#FF3B30]" : "text-white";
  return (
    <div data-testid={testid} className="border border-white/10 bg-[#121212] p-4">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
        {icon} {label}
      </div>
      <div className={`mt-2 font-display text-3xl font-black tracking-tight ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] font-mono text-white/50">{sub}</div>}
    </div>
  );
}

function StateBadge({ status, t }) {
  const color = status === "RUNNING" ? "#34C759" : status === "ERROR" ? "#FF3B30" : "#71717A";
  const label = status === "RUNNING" ? t("running") : status === "ERROR" ? t("error") : t("stopped");
  return (
    <div data-testid="bot-state-badge" className="inline-flex items-center gap-2 border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest">
      <span className="h-2 w-2 rounded-full pulse-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      Engine · <span style={{ color }}>{label}</span>
    </div>
  );
}
