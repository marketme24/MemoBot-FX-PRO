import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { useBot } from "../context/BotContext";
import { ExternalLink, Zap, Brain } from "lucide-react";
import { toast } from "sonner";

export default function Market() {
  const { tickers } = useBot();
  const [selected, setSelected] = useState("BTCUSDT");
  const [indicators, setIndicators] = useState(null);
  const [opps, setOpps] = useState([]);
  const [sent, setSent] = useState(null);
  const [loadingSent, setLoadingSent] = useState(false);

  useEffect(() => {
    api.get("/market/opportunities").then(({ data }) => setOpps(data));
  }, []);

  useEffect(() => {
    setIndicators(null); setSent(null);
    api.get(`/market/indicators/${selected}`).then(({ data }) => setIndicators(data));
  }, [selected]);

  const runSent = async () => {
    setLoadingSent(true);
    try {
      const { data } = await api.get(`/ai/sentiment/${selected}`);
      setSent(data);
    } catch { toast.error("Sentiment failed"); }
    finally { setLoadingSent(false); }
  };

  const t = tickers.find((x) => x.symbol === selected);

  return (
    <Layout>
      <div>
        <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">data room</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase mb-6">Market Overview</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-white/10 bg-[#121212] p-5 lg:col-span-1">
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">top opportunities</div>
          <h2 className="font-display text-xl font-bold tracking-tight mb-3">By confluence</h2>
          <div className="space-y-2" data-testid="opportunities-list">
            {opps.map((o) => (
              <div key={o.symbol} className="flex items-center justify-between border border-white/5 p-2.5">
                <div className="cursor-pointer" onClick={() => setSelected(o.symbol)} data-testid={`select-${o.symbol}`}>
                  <div className="font-display font-bold">{o.symbol}</div>
                  <div className="font-mono text-[10px] text-white/40">Score {o.score}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">${o.price.toLocaleString()}</div>
                  <div className={`font-mono text-[10px] ${o.change_24h_pct >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                    {o.change_24h_pct >= 0 ? "+" : ""}{o.change_24h_pct.toFixed(2)}%
                  </div>
                </div>
                <a href={o.binance_url} target="_blank" rel="noreferrer" className="p-2 text-white/30 hover:text-[#007AFF]"><ExternalLink size={12} /></a>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="border border-white/10 bg-[#121212] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">symbol focus</div>
                <h2 className="font-display text-3xl font-black tracking-tighter">{selected}</h2>
              </div>
              <a href={t?.binance_url || "#"} target="_blank" rel="noreferrer" data-testid="market-binance-link"
                 className="inline-flex items-center gap-2 border border-white/10 hover:border-[#007AFF] px-3 py-2 text-xs font-mono uppercase tracking-widest">
                open chart <ExternalLink size={12} />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <Mini label="Price" value={t ? `$${t.price.toLocaleString()}` : "—"} />
              <Mini label="24h Δ" value={t ? `${t.change_24h_pct >= 0 ? "+" : ""}${t.change_24h_pct.toFixed(2)}%` : "—"}
                    tone={(t?.change_24h_pct || 0) >= 0 ? "up" : "down"} />
              <Mini label="24h vol" value={t ? `$${(t.volume_24h/1e9).toFixed(2)}B` : "—"} />
            </div>

            {indicators ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="indicators-grid">
                <Gauge label="MFI (Money Flow)" value={indicators.mfi}
                       hint={indicators.mfi > 70 ? "overbought" : indicators.mfi < 30 ? "oversold" : "balanced"} />
                <Gauge label="CCI (Commodity)" value={indicators.cci}
                       hint={indicators.cci > 100 ? "overbought" : indicators.cci < -100 ? "oversold" : "ranging"} />
                <Gauge label="SMC (Smart Money)" value={indicators.smc.bias}
                       hint={`BOS: ${indicators.smc.bos} · swing ${indicators.smc.swing_low}↔${indicators.smc.swing_high}`} />
                <Gauge label="Order Flow" value={indicators.order_flow.direction}
                       hint={`net ${Math.round(indicators.order_flow.net_delta/1e6)}M`} />
              </div>
            ) : <div className="text-white/40 font-mono text-sm">loading indicators…</div>}

            <button data-testid="market-sentiment-btn" onClick={runSent} disabled={loadingSent}
              className="mt-4 w-full border border-[#007AFF]/40 hover:border-[#007AFF] hover:bg-[#007AFF]/5 px-3 py-2.5 text-xs font-display font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Brain size={12} /> {loadingSent ? "analyzing…" : "Run Claude AI sentiment"}
            </button>
            {sent && (
              <div className="mt-3 border border-white/10 p-3 text-xs" data-testid="market-sentiment-result">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold uppercase">{sent.sentiment}</span>
                  <span className={`font-mono ${sent.score > 0 ? "text-[#34C759]" : sent.score < 0 ? "text-[#FF3B30]" : "text-white"}`}>
                    {sent.score > 0 ? "+" : ""}{sent.score}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/60">{sent.reasoning}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Mini({ label, value, tone }) {
  const cls = tone === "up" ? "text-[#34C759]" : tone === "down" ? "text-[#FF3B30]" : "text-white";
  return (
    <div className="border border-white/10 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function Gauge({ label, value, hint }) {
  return (
    <div className="border border-white/10 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-display text-2xl font-black capitalize">{typeof value === "number" ? value.toFixed(2) : value}</div>
      <div className="text-[10px] font-mono text-white/50 mt-0.5">{hint}</div>
    </div>
  );
}
