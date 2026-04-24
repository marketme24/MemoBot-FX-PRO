import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Check, CreditCard, Zap, Crown } from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { id: "stripe", label: "Stripe (live)" },
  { id: "paypal", label: "PayPal (stub)" },
  { id: "telr", label: "Telr (stub · UAE)" },
  { id: "payfort", label: "PayFort (stub · UAE)" },
  { id: "checkout", label: "Checkout.com (stub)" },
  { id: "paytabs", label: "PayTabs (stub)" },
];

const ICONS = { starter: CreditCard, pro: Zap, elite: Crown };

export default function Subscription() {
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState({});
  const [provider, setProvider] = useState("stripe");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api.get("/payments/plans").then(({ data }) => setPlans(data));
  }, []);

  const checkout = async (planId) => {
    setBusy(planId);
    try {
      const { data } = await api.post("/payments/checkout", {
        plan_id: planId, provider, origin_url: window.location.origin,
      });
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.info(data.message || `${provider} stubbed — contact support to activate`);
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Checkout failed");
    } finally { setBusy(""); }
  };

  return (
    <Layout>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">billing</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase">Subscription</h1>
        <p className="text-sm text-white/50 mt-2">Current plan: <span className="text-[#007AFF] font-mono uppercase" data-testid="current-plan">{user?.subscription_plan || "free"}</span></p>
      </div>

      <div className="mb-5">
        <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase mb-2">payment provider</div>
        <div className="flex flex-wrap gap-2" data-testid="provider-switch">
          {PROVIDERS.map((p) => (
            <button key={p.id} data-testid={`provider-${p.id}`} onClick={() => setProvider(p.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border ${
                provider === p.id ? "bg-[#007AFF] border-[#007AFF]" : "border-white/10 hover:border-white/30"
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="plan-cards">
        {Object.entries(plans).map(([id, plan]) => {
          const Icon = ICONS[id] || CreditCard;
          const isCurrent = user?.subscription_plan === id;
          return (
            <div key={id} className={`relative border p-6 ${isCurrent ? "border-[#007AFF]" : "border-white/10"} bg-[#121212]`}>
              {isCurrent && (
                <div className="absolute -top-3 left-6 px-2 py-0.5 bg-[#007AFF] text-white font-mono text-[10px] uppercase tracking-widest">Active</div>
              )}
              <Icon size={20} className="text-[#007AFF]" />
              <div className="mt-3 font-display text-3xl font-black uppercase">{plan.name}</div>
              <div className="mt-2">
                <span className="font-display text-5xl font-black tracking-tighter">${plan.price}</span>
                <span className="font-mono text-xs text-white/40 ml-1">/ mo</span>
              </div>
              <ul className="mt-5 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <Check size={14} className="text-[#34C759] mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                data-testid={`subscribe-${id}`}
                onClick={() => checkout(id)}
                disabled={busy === id || isCurrent}
                className={`mt-6 w-full py-3 font-display font-bold uppercase tracking-widest text-xs transition-colors ${
                  isCurrent ? "bg-white/5 text-white/40 cursor-not-allowed" :
                  "bg-[#007AFF] hover:bg-[#3395FF] text-white"
                }`}>
                {isCurrent ? "Current plan" : busy === id ? "redirecting…" : `Subscribe via ${provider}`}
              </button>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
