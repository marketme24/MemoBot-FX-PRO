import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatApiError } from "../lib/api";
import { Plus, Trash2, Zap, Bot, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STRATEGY_TYPES = [
  { id: "trend", label: "Trend Following", desc: "SMA cross + MFI + order flow" },
  { id: "grid", label: "Grid", desc: "Buy low / sell high within range" },
  { id: "mean_reversion", label: "Mean Reversion", desc: "Fade extremes with CCI" },
  { id: "breakout", label: "Breakout", desc: "20-bar range breaks" },
  { id: "scalping", label: "Scalping", desc: "3-bar momentum" },
];

export default function Strategies() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [signal, setSignal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "Trend Hunter BTC", trading_pair: "BTCUSDT", strategy_type: "trend",
    ai_sentiment_enabled: true, investment_amount: 1000,
    lower_price_limit: "", upper_price_limit: "",
  });

  const load = async () => {
    try {
      const { data } = await api.get("/strategies");
      setList(data);
      if (!selected && data.length) setSelected(data[0]);
    } catch (_) {}
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async () => {
    try {
      const payload = { ...form };
      if (payload.lower_price_limit === "") payload.lower_price_limit = null;
      if (payload.upper_price_limit === "") payload.upper_price_limit = null;
      payload.investment_amount = Number(payload.investment_amount);
      const { data } = await api.post("/strategies", payload);
      setList((p) => [...p, data]);
      setSelected(data);
      setCreating(false);
      toast.success("Strategy created");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Create failed");
    }
  };

  const remove = async (id) => {
    await api.delete(`/strategies/${id}`);
    setList((p) => p.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Strategy removed");
  };

  const runSignal = async () => {
    if (!selected) return;
    try {
      const { data } = await api.post(`/strategies/${selected.id}/signal`);
      setSignal(data);
    } catch (e) { toast.error("Signal failed"); }
  };

  const toggleActive = async () => {
    if (!selected) return;
    const { data } = await api.patch(`/strategies/${selected.id}`, { active: !selected.active });
    setSelected(data);
    setList((p) => p.map((s) => s.id === data.id ? data : s));
  };

  return (
    <Layout>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">library</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase">Strategies</h1>
        </div>
        <button
          data-testid="new-strategy-btn"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 bg-[#007AFF] hover:bg-[#3395FF] px-4 py-2 text-xs font-display font-bold uppercase tracking-widest">
          <Plus size={14} /> New strategy
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-1 border border-white/10 bg-[#121212] p-4" data-testid="strategy-list">
          <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase mb-2">active ({list.length})</div>
          {list.length === 0 && <div className="text-xs text-white/40 font-mono py-4">No strategies yet.</div>}
          <div className="space-y-1">
            {list.map((s) => (
              <button
                key={s.id}
                data-testid={`strategy-${s.id}`}
                onClick={() => { setSelected(s); setSignal(null); }}
                className={`w-full text-left border px-3 py-2.5 transition-colors flex items-center justify-between ${
                  selected?.id === s.id ? "border-[#007AFF] bg-[#007AFF]/5" : "border-white/10 hover:border-white/20"
                }`}
              >
                <div>
                  <div className="text-sm font-display font-bold">{s.name}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">{s.strategy_type} · {s.trading_pair}</div>
                </div>
                <ChevronRight size={14} className="text-white/30" />
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {creating ? (
            <CreateForm form={form} setForm={setForm} onCancel={() => setCreating(false)} onCreate={create} />
          ) : selected ? (
            <div className="border border-white/10 bg-[#121212] p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">{selected.strategy_type}</div>
                  <h2 className="font-display text-3xl font-black tracking-tight">{selected.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button data-testid="strategy-toggle-active" onClick={toggleActive}
                    className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest border ${
                      selected.active ? "border-[#34C759] text-[#34C759]" : "border-white/30 text-white/60"
                    }`}>
                    {selected.active ? "Active" : "Paused"}
                  </button>
                  <button data-testid="strategy-delete" onClick={() => remove(selected.id)}
                    className="p-2 border border-white/10 hover:border-[#FF3B30] hover:text-[#FF3B30]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <StatBox label="Pair" value={selected.trading_pair} />
                <StatBox label="Investment" value={`$${selected.investment_amount}`} />
                <StatBox label="Lower" value={selected.lower_price_limit ?? "—"} />
                <StatBox label="Upper" value={selected.upper_price_limit ?? "—"} />
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">live signal</div>
                    <h3 className="font-display text-xl font-bold">Generate now</h3>
                  </div>
                  <button
                    data-testid="generate-signal-btn"
                    onClick={runSignal}
                    className="inline-flex items-center gap-2 bg-[#007AFF] hover:bg-[#3395FF] px-3 py-2 text-xs font-display font-bold uppercase tracking-widest">
                    <Zap size={12} /> Run
                  </button>
                </div>
                {signal && (
                  <div className="mt-4 border border-white/10 p-4" data-testid="signal-result">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">signal</div>
                        <div className={`font-display text-2xl font-black uppercase ${
                          signal.signal === "buy" ? "text-[#007AFF]" : signal.signal === "sell" ? "text-[#FF3B30]" : "text-white/70"
                        }`}>
                          {signal.signal}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">confidence</div>
                        <div className="font-mono text-xl">{Math.round(signal.confidence * 100)}%</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/70">{signal.reason}</div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
                      <span>MFI {signal.indicators.mfi}</span>
                      <span>CCI {signal.indicators.cci}</span>
                      <span>SMC {signal.indicators.smc.bias}</span>
                      <span>OF {signal.indicators.order_flow.direction}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-white/10 bg-[#121212] p-8 text-center">
              <Bot size={32} className="mx-auto text-white/30" />
              <div className="mt-2 text-sm text-white/50">Select or create a strategy.</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function CreateForm({ form, setForm, onCancel, onCreate }) {
  return (
    <div className="border border-white/10 bg-[#121212] p-5 space-y-4" data-testid="create-strategy-form">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight">New strategy</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="name">
          <input data-testid="form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                 className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm" />
        </Field>
        <Field label="trading pair">
          <input data-testid="form-pair" value={form.trading_pair} onChange={(e) => setForm({ ...form, trading_pair: e.target.value.toUpperCase() })}
                 className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="type">
          <select data-testid="form-type" value={form.strategy_type} onChange={(e) => setForm({ ...form, strategy_type: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm">
            {STRATEGY_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="investment (usd)">
          <input data-testid="form-investment" type="number" value={form.investment_amount} onChange={(e) => setForm({ ...form, investment_amount: e.target.value })}
                 className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="lower price (optional)">
          <input data-testid="form-lower" type="number" value={form.lower_price_limit} onChange={(e) => setForm({ ...form, lower_price_limit: e.target.value })}
                 className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono" />
        </Field>
        <Field label="upper price (optional)">
          <input data-testid="form-upper" type="number" value={form.upper_price_limit} onChange={(e) => setForm({ ...form, upper_price_limit: e.target.value })}
                 className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input data-testid="form-ai" type="checkbox" checked={form.ai_sentiment_enabled}
               onChange={(e) => setForm({ ...form, ai_sentiment_enabled: e.target.checked })} />
        Enable AI sentiment layer (Claude Sonnet 4.5)
      </label>
      <div className="flex gap-2">
        <button data-testid="form-create-btn" onClick={onCreate} className="bg-[#007AFF] hover:bg-[#3395FF] px-4 py-2 text-xs font-display font-bold uppercase tracking-widest">Create strategy</button>
        <button onClick={onCancel} className="border border-white/10 hover:border-white/30 px-4 py-2 text-xs font-mono uppercase">Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</div>
      {children}
    </label>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="border border-white/10 p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-white">{value}</div>
    </div>
  );
}
