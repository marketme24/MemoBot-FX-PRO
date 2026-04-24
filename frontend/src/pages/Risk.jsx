import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { Save, ShieldAlert, Gauge, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Risk() {
  const [risk, setRisk] = useState(null);
  const [protect, setProtect] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [r, p] = await Promise.all([api.get("/risk/profile"), api.get("/risk/protection")]);
    setRisk(r.data); setProtect(p.data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/risk/profile", risk);
      await api.put("/risk/protection", protect);
      toast.success("Risk & protection updated");
    } finally { setSaving(false); }
  };

  if (!risk || !protect) return <Layout><div className="font-mono text-sm text-white/40">loading…</div></Layout>;

  return (
    <Layout>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">safeguards</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase">Risk & Protection</h1>
        </div>
        <button
          data-testid="save-risk"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#007AFF] hover:bg-[#3395FF] px-4 py-2 text-xs font-display font-bold uppercase tracking-widest">
          <Save size={14} /> {saving ? "saving…" : "Save changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-white/10 bg-[#121212] p-5" data-testid="risk-profile-card">
          <div className="flex items-center gap-2 mb-3"><ShieldAlert size={16} className="text-[#007AFF]" /><h2 className="font-display text-xl font-bold uppercase tracking-tight">Risk Profile</h2></div>

          <div className="space-y-4">
            <div>
              <Label>risk level</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {["low", "mid", "high"].map((lvl) => (
                  <button key={lvl} data-testid={`risk-level-${lvl}`} onClick={() => setRisk({ ...risk, level: lvl })}
                    className={`py-2 font-display font-bold uppercase text-xs tracking-widest border ${
                      risk.level === lvl ? (lvl === "low" ? "bg-[#34C759] border-[#34C759]" : lvl === "mid" ? "bg-[#FFCC00] border-[#FFCC00] text-black" : "bg-[#FF3B30] border-[#FF3B30]") : "border-white/10 text-white/70 hover:border-white/30"
                    }`}>{lvl}</button>
                ))}
              </div>
            </div>

            <Slider label="Max drawdown" unit="%" value={risk.max_drawdown_pct} min={1} max={50} step={0.5}
                    onChange={(v) => setRisk({ ...risk, max_drawdown_pct: v })} testid="slider-max-dd" />
            <Slider label="Max leverage" unit="x" value={risk.max_leverage} min={1} max={20} step={0.5}
                    onChange={(v) => setRisk({ ...risk, max_leverage: v })} testid="slider-leverage" />
            <Slider label="Max position size" unit="$" value={risk.max_position_size_usd} min={100} max={100000} step={100}
                    onChange={(v) => setRisk({ ...risk, max_position_size_usd: v })} testid="slider-pos-size" />
            <Slider label="Max daily loss" unit="$" value={risk.max_daily_loss_usd} min={50} max={10000} step={50}
                    onChange={(v) => setRisk({ ...risk, max_daily_loss_usd: v })} testid="slider-daily-loss" />
            <Slider label="Max concurrent trades" unit="" value={risk.max_concurrent_trades} min={1} max={50} step={1}
                    onChange={(v) => setRisk({ ...risk, max_concurrent_trades: v })} testid="slider-concurrent" />
          </div>
        </div>

        <div className="border border-white/10 bg-[#121212] p-5" data-testid="protection-card">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-[#FFCC00]" /><h2 className="font-display text-xl font-bold uppercase tracking-tight">Protection Settings</h2></div>

          <div className="space-y-4">
            <Toggle label="Full risk protection" description="Enforce all pre-trade checks" value={protect.full_risk_protection}
                    onChange={(v) => setProtect({ ...protect, full_risk_protection: v })} testid="toggle-full-protection" />
            <Toggle label="Data stability required" description="Block trades on stale feed" value={protect.data_stability_required}
                    onChange={(v) => setProtect({ ...protect, data_stability_required: v })} testid="toggle-data-stability" />
            <Slider label="Daily drawdown limit" unit="%" value={protect.daily_drawdown_limit_pct} min={1} max={20} step={0.5}
                    onChange={(v) => setProtect({ ...protect, daily_drawdown_limit_pct: v })} testid="slider-daily-dd" />
            <Slider label="Slippage limit" unit="%" value={protect.slippage_limit_pct} min={0.05} max={2} step={0.05}
                    onChange={(v) => setProtect({ ...protect, slippage_limit_pct: v })} testid="slider-slippage" />
            <Slider label="Max orders / minute" unit="" value={protect.max_orders_per_minute} min={1} max={60} step={1}
                    onChange={(v) => setProtect({ ...protect, max_orders_per_minute: v })} testid="slider-orders-rate" />
            <Slider label="Circuit breaker (ATR %)" unit="%" value={protect.circuit_breaker_pct} min={1} max={30} step={0.5}
                    onChange={(v) => setProtect({ ...protect, circuit_breaker_pct: v })} testid="slider-circuit" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Label({ children }) {
  return <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{children}</div>;
}

function Slider({ label, unit, value, min, max, step, onChange, testid }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="font-mono text-sm" data-testid={`${testid}-value`}>{unit === "$" ? `$${Number(value).toLocaleString()}` : `${value}${unit}`}</div>
      </div>
      <input data-testid={testid} type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(parseFloat(e.target.value))}
             className="w-full accent-[#007AFF] mt-1" />
      <div className="flex justify-between font-mono text-[9px] text-white/30">
        <span>{unit === "$" ? `$${min}` : `${min}${unit}`}</span>
        <span>{unit === "$" ? `$${max}` : `${max}${unit}`}</span>
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange, testid }) {
  return (
    <label className="flex items-start justify-between gap-4 border border-white/10 p-3 cursor-pointer hover:border-white/20">
      <div>
        <div className="text-sm">{label}</div>
        <div className="text-[10px] font-mono text-white/40 mt-0.5">{description}</div>
      </div>
      <button data-testid={testid} onClick={() => onChange(!value)} type="button"
        className={`relative h-6 w-11 shrink-0 border transition-colors ${value ? "bg-[#34C759] border-[#34C759]" : "bg-transparent border-white/20"}`}>
        <span className={`absolute top-0.5 h-[18px] w-[18px] bg-white transition-all ${value ? "left-5" : "left-0.5"}`} />
      </button>
    </label>
  );
}
