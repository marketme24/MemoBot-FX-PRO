import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatApiError } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useBot } from "../context/BotContext";
import { useI18n } from "../i18n/I18nContext";
import {
  ArrowDown, ArrowUp, Check, AlertTriangle, ExternalLink, Loader2, Brain, Zap,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: "validation", label: "Validation" },
  { id: "risk", label: "Risk check" },
  { id: "routing", label: "Routing" },
  { id: "fill", label: "Fill" },
  { id: "record", label: "Record" },
];

export default function Trading() {
  const { tickers, bot } = useBot();
  const { t } = useI18n();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [qty, setQty] = useState(0.01);
  const [side, setSide] = useState("buy");
  const [depth, setDepth] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loadingSent, setLoadingSent] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [stepResults, setStepResults] = useState([]);
  const [lastFill, setLastFill] = useState(null);
  const [executing, setExecuting] = useState(false);

  const ticker = tickers.find((t) => t.symbol === symbol);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, ind] = await Promise.all([
          api.get(`/market/depth/${symbol}?limit=10`),
          api.get(`/market/indicators/${symbol}`),
        ]);
        setDepth(d.data);
        setIndicators(ind.data);
      } catch (_) {}
    };
    load();
  }, [symbol]);

  const runSentiment = async () => {
    setLoadingSent(true);
    try {
      const { data } = await api.get(`/ai/sentiment/${symbol}`);
      setSentiment(data);
    } catch (e) {
      toast.error("Sentiment unavailable");
    } finally {
      setLoadingSent(false);
    }
  };

  const execute = async () => {
    if (bot?.status !== "RUNNING") {
      toast.error("Start the engine first from the Bot Control page.");
      return;
    }
    setExecuting(true);
    setStepResults([]);
    setLastFill(null);

    // Step 1: validation (local)
    setStepIndex(0);
    await sleep(350);
    setStepResults((p) => [...p, { id: "validation", ok: qty > 0, detail: `Order ${side.toUpperCase()} ${qty} ${symbol}` }]);

    // Step 2: risk preview
    setStepIndex(1);
    let riskPreview;
    try {
      const { data } = await api.post("/trade/preview", {
        trading_pair: symbol, side, order_type: "market", quantity: qty,
      });
      riskPreview = data;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Preview failed");
      setStepIndex(-1);
      setExecuting(false);
      return;
    }
    if (!riskPreview.ok) {
      setStepResults((p) => [...p, { id: "risk", ok: false, detail: riskPreview.reason, checks: riskPreview.checks }]);
      setStepIndex(-1);
      setExecuting(false);
      toast.error(riskPreview.reason || "Risk blocked the order");
      return;
    }
    setStepResults((p) => [...p, { id: "risk", ok: true, detail: "All risk checks passed", checks: riskPreview.checks }]);
    await sleep(250);

    // Step 3: routing
    setStepIndex(2);
    setStepResults((p) => [...p, { id: "routing", ok: true, detail: "Routed to execution engine" }]);
    await sleep(300);

    // Step 4 + 5: execute (fill + record)
    setStepIndex(3);
    try {
      const { data } = await api.post("/trade/execute", {
        trading_pair: symbol, side, order_type: "market", quantity: qty,
      });
      setStepResults((p) => [...p, { id: "fill", ok: true, detail: `Filled @ $${data.order.fill_price.toFixed(4)} (slip ${data.order.slippage_pct}%)` }]);
      await sleep(250);
      setStepIndex(4);
      setStepResults((p) => [...p, { id: "record", ok: true, detail: `Trade ${data.trade.id.slice(0, 8)}… saved` }]);
      setLastFill(data);
      toast.success(`${side.toUpperCase()} ${qty} ${symbol} filled`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">{t("trading_overline")}</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] bg-clip-text text-transparent">{t("trading_title")}</h1>
        </div>
        <a href={ticker?.binance_url || "#"} target="_blank" rel="noreferrer"
           data-testid="open-binance-chart"
           className="inline-flex items-center gap-2 border border-white/10 hover:border-[#FFD27D] px-3 py-2 text-xs font-mono uppercase tracking-wider">
          {t("open_binance")} <ExternalLink size={12} />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order ticket */}
        <div className="border border-white/10 bg-[#121212] p-5 space-y-4">
          <div>
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">symbol</div>
            <select
              data-testid="symbol-select"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1 w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono"
            >
              {tickers.map((t) => (
                <option key={t.symbol} value={t.symbol}>{t.symbol} · ${t.price.toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">quantity</div>
            <input
              data-testid="qty-input"
              type="number"
              step="0.0001"
              min="0.0001"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value || 0))}
              className="mt-1 w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono"
            />
            <div className="mt-1 text-[10px] font-mono text-white/40">
              ≈ ${((ticker?.price || 0) * qty).toFixed(2)} notional
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">side</div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                data-testid="side-buy"
                onClick={() => setSide("buy")}
                className={`py-3 border font-display font-bold uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2 ${
                  side === "buy" ? "bg-[#007AFF] border-[#007AFF] text-white" : "border-white/10 text-white/70 hover:border-[#007AFF]"
                }`}
              >
                <ArrowUp size={14} /> Buy
              </button>
              <button
                data-testid="side-sell"
                onClick={() => setSide("sell")}
                className={`py-3 border font-display font-bold uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2 ${
                  side === "sell" ? "bg-[#FF3B30] border-[#FF3B30] text-white" : "border-white/10 text-white/70 hover:border-[#FF3B30]"
                }`}
              >
                <ArrowDown size={14} /> Sell
              </button>
            </div>
          </div>

          <button
            data-testid="execute-btn"
            onClick={execute}
            disabled={executing}
            className={`w-full py-4 font-display font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-sm ${
              side === "buy" ? "bg-[#007AFF] hover:bg-[#3395FF]" : "bg-[#FF3B30] hover:bg-[#FF3B30]/80"
            } text-white disabled:opacity-50`}
          >
            {executing ? <><Loader2 size={16} className="animate-spin" /> executing…</> : <><Zap size={16} /> Execute {side.toUpperCase()}</>}
          </button>
          {bot?.status !== "RUNNING" && (
            <div className="text-[10px] text-[#FFCC00] font-mono flex items-center gap-1">
              <AlertTriangle size={12} /> Engine is {bot?.status || "stopped"} — trades blocked until started.
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="border border-white/10 bg-[#121212] p-5">
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">workflow</div>
          <h2 className="font-display text-xl font-bold tracking-tight mb-4">Trade pipeline</h2>
          <div className="space-y-2" data-testid="trade-stepper">
            {STEPS.map((s, i) => {
              const result = stepResults.find((r) => r.id === s.id);
              const active = stepIndex === i;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: active || result ? 1 : 0.3 }}
                  className={`border px-3 py-2 flex items-start gap-2 ${
                    result?.ok === false ? "border-[#FF3B30]/50 bg-[#FF3B30]/5"
                    : result?.ok ? "border-[#34C759]/30 bg-[#34C759]/5"
                    : active ? "border-[#007AFF] bg-[#007AFF]/5" : "border-white/10"
                  }`}
                >
                  <div className="mt-0.5">
                    {result?.ok ? <Check size={14} className="text-[#34C759]" />
                    : result?.ok === false ? <AlertTriangle size={14} className="text-[#FF3B30]" />
                    : active ? <Loader2 size={14} className="animate-spin text-[#007AFF]" />
                    : <div className="h-3.5 w-3.5 border border-white/20 rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-display font-bold uppercase tracking-wider">{s.label}</div>
                    {result?.detail && <div className="text-[10px] font-mono text-white/60 mt-0.5">{result.detail}</div>}
                    {result?.checks && (
                      <div className="mt-1 space-y-0.5">
                        {result.checks.map((c, idx) => (
                          <div key={idx} className={`text-[10px] font-mono flex items-center gap-1 ${c.ok ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                            {c.ok ? "✓" : "✗"} {c.name}: {c.detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <AnimatePresence>
            {lastFill && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 border border-[#34C759]/40 bg-[#34C759]/5 p-3 text-xs font-mono"
                data-testid="last-fill"
              >
                <div className="text-[#34C759]">✓ Order {lastFill.order.id.slice(0,8)}… filled</div>
                <div className="text-white/70 mt-1">
                  {lastFill.order.side.toUpperCase()} {lastFill.order.quantity} {lastFill.order.trading_pair} @ ${lastFill.order.fill_price.toFixed(4)} · slip {lastFill.order.slippage_pct}%
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Market data + depth */}
        <div className="space-y-4">
          <div className="border border-white/10 bg-[#121212] p-5">
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">indicators</div>
            <h2 className="font-display text-xl font-bold tracking-tight mb-3">Signal stack</h2>
            {indicators && (
              <div className="grid grid-cols-2 gap-2 text-xs" data-testid="indicator-panel">
                <Metric label="MFI" value={indicators.mfi} hint={indicators.mfi > 70 ? "overbought" : indicators.mfi < 30 ? "oversold" : "neutral"} />
                <Metric label="CCI" value={indicators.cci} hint={indicators.cci > 100 ? "overbought" : indicators.cci < -100 ? "oversold" : "neutral"} />
                <Metric label="SMC" value={indicators.smc.bias} hint={`BOS: ${indicators.smc.bos}`} />
                <Metric label="Order Flow" value={indicators.order_flow.direction} hint={`Δ ${Math.round(indicators.order_flow.net_delta/1e6)}M`} />
              </div>
            )}
            <button
              data-testid="ai-sentiment-btn"
              onClick={runSentiment}
              disabled={loadingSent}
              className="mt-3 w-full border border-[#007AFF]/40 hover:border-[#007AFF] hover:bg-[#007AFF]/5 px-3 py-2 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {loadingSent ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
              {loadingSent ? "analyzing…" : "Run AI sentiment (Claude)"}
            </button>
            {sentiment && (
              <div className="mt-3 border border-white/10 p-3 text-xs" data-testid="ai-sentiment-result">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold uppercase">{sentiment.sentiment}</span>
                  <span className={`font-mono ${sentiment.score > 0 ? "text-[#34C759]" : sentiment.score < 0 ? "text-[#FF3B30]" : "text-white"}`}>
                    {sentiment.score > 0 ? "+" : ""}{sentiment.score}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/60">{sentiment.reasoning}</div>
              </div>
            )}
          </div>

          <div className="border border-white/10 bg-[#121212] p-5">
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">order book (synthetic)</div>
            <h2 className="font-display text-xl font-bold tracking-tight mb-3">Depth L2</h2>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono" data-testid="order-book">
              <div>
                {depth?.asks.slice().reverse().map((a, i) => (
                  <div key={i} className="flex justify-between text-[#FF3B30] py-0.5">
                    <span>{a[0].toFixed(2)}</span><span>{a[1].toFixed(3)}</span>
                  </div>
                ))}
              </div>
              <div>
                {depth?.bids.map((b, i) => (
                  <div key={i} className="flex justify-between text-[#007AFF] py-0.5">
                    <span>{b[0].toFixed(2)}</span><span>{b[1].toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className="border border-white/10 p-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="font-display text-lg font-bold capitalize">{typeof value === "number" ? value.toFixed(1) : value}</div>
      <div className="text-[10px] font-mono text-white/50">{hint}</div>
    </div>
  );
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
