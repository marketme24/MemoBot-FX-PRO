import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { Download, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const PERIODS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export default function Reports() {
  const [period, setPeriod] = useState("daily");
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get(`/reports/${period}`).then(({ data }) => setReport(data));
  }, [period]);

  const download = async () => {
    try {
      const { data } = await api.get(`/reports/${period}/csv`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${period}_report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (e) {
      toast.error("Download failed");
    }
  };

  return (
    <Layout>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">audit trail</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase">Reports</h1>
        </div>
        <button
          data-testid="download-report-csv"
          onClick={download}
          className="inline-flex items-center gap-2 bg-[#007AFF] hover:bg-[#3395FF] px-4 py-2 text-xs font-display font-bold uppercase tracking-widest">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-1 mb-4" data-testid="report-period-tabs">
        {PERIODS.map((p) => (
          <button key={p.id} data-testid={`report-period-${p.id}`} onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 text-xs font-display font-bold uppercase tracking-widest border ${
              period === p.id ? "bg-[#007AFF] border-[#007AFF]" : "border-white/10 hover:border-white/30"
            }`}>{p.label}</button>
        ))}
      </div>

      {!report ? <div className="text-white/40 font-mono text-sm">loading…</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4" data-testid="report-summary">
            <Summary label="Trades" value={report.summary.trade_count} />
            <Summary label="PnL" value={`$${report.summary.total_pnl.toFixed(2)}`} tone={report.summary.total_pnl >= 0 ? "up" : "down"} />
            <Summary label="Volume" value={`$${(report.summary.total_volume/1000).toFixed(1)}K`} />
            <Summary label="Win Rate" value={`${report.summary.win_rate.toFixed(1)}%`} />
            <Summary label="Max DD" value={`${report.summary.max_drawdown_pct}%`} tone="down" />
          </div>

          <div className="border border-white/10 bg-[#121212] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
              <FileText size={14} className="text-white/40" />
              <div className="font-display text-sm font-bold uppercase tracking-widest">Trade log ({report.trades.length})</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="trade-log-table">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10">
                    <th className="py-2 px-5">Time</th><th>Pair</th><th>Side</th><th>Qty</th><th>Price</th><th>Notional</th><th className="text-right pr-5">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {report.trades.slice(0, 200).map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2 px-5 font-mono text-xs text-white/60">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="font-display font-bold">{t.trading_pair}</td>
                      <td className={`font-mono uppercase ${t.side==="buy"?"text-[#007AFF]":"text-[#FF3B30]"}`}>{t.side}</td>
                      <td className="font-mono">{t.quantity}</td>
                      <td className="font-mono">${Number(t.price).toFixed(4)}</td>
                      <td className="font-mono">${Number(t.notional_usd).toFixed(2)}</td>
                      <td className={`text-right pr-5 font-mono ${t.realized_pnl>=0?"text-[#34C759]":"text-[#FF3B30]"}`}>
                        {t.realized_pnl >= 0 ? "+" : ""}${Number(t.realized_pnl).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {report.trades.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-white/40 font-mono text-xs">No trades in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function Summary({ label, value, tone }) {
  const cls = tone === "up" ? "text-[#34C759]" : tone === "down" ? "text-[#FF3B30]" : "text-white";
  return (
    <div className="border border-white/10 bg-[#121212] p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 font-display text-xl font-black ${cls}`}>{value}</div>
    </div>
  );
}
