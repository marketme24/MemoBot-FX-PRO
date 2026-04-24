import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Check, X, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const nav = useNavigate();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("polling");
  const [tx, setTx] = useState(null);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        setTx(data);
        if (data.status === "paid") {
          setStatus("success");
          await refresh();
          return;
        }
        if (data.status === "expired" || data.status === "failed") {
          setStatus("failed");
          return;
        }
      } catch (e) {}
      if (attempts < 6) setTimeout(poll, 2000);
      else setStatus("timeout");
    };
    poll();
  }, [sessionId, refresh]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-white/10 bg-[#121212] p-8 text-center" data-testid="payment-status-card">
        {status === "polling" && (
          <>
            <Loader2 className="animate-spin mx-auto text-[#007AFF]" size={32} />
            <h1 className="mt-3 font-display text-2xl font-black uppercase">Confirming payment…</h1>
            <p className="mt-2 text-sm text-white/50">Please don't close this page.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-[#34C759]/20 flex items-center justify-center"><Check size={28} className="text-[#34C759]" /></div>
            <h1 className="mt-3 font-display text-2xl font-black uppercase text-[#34C759]">Payment confirmed</h1>
            <p className="mt-2 text-sm text-white/60">Your subscription is active. {tx?.plan_id ? `Plan: ${tx.plan_id}` : ""}</p>
            <Link to="/dashboard" className="mt-6 inline-block bg-[#007AFF] hover:bg-[#3395FF] px-4 py-2 text-xs font-display font-bold uppercase tracking-widest">Go to dashboard</Link>
          </>
        )}
        {(status === "failed" || status === "error") && (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-[#FF3B30]/20 flex items-center justify-center"><X size={28} className="text-[#FF3B30]" /></div>
            <h1 className="mt-3 font-display text-2xl font-black uppercase text-[#FF3B30]">Payment failed</h1>
            <Link to="/subscription" className="mt-6 inline-block border border-white/10 hover:border-white/30 px-4 py-2 text-xs font-mono uppercase">Try again</Link>
          </>
        )}
        {status === "timeout" && (
          <>
            <h1 className="font-display text-2xl font-black uppercase">Still processing…</h1>
            <p className="mt-2 text-sm text-white/60">Refresh later or contact support.</p>
            <Link to="/dashboard" className="mt-6 inline-block border border-white/10 px-4 py-2 text-xs font-mono uppercase">Dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}
