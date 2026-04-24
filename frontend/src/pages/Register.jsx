import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Activity, Mail, KeyRound, User, ArrowRight } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register(form.email, form.password, form.name);
      nav("/dashboard");
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] grid md:grid-cols-2">
      <div className="flex items-center justify-center p-6 lg:p-12 order-2 md:order-1">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-8 md:hidden">
              <div className="h-8 w-8 rounded-sm bg-[#007AFF] flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div className="font-display text-xl font-black">MEMOBOT FX-PRO</div>
            </div>
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">create account</div>
            <h1 className="font-display text-4xl font-black tracking-tighter uppercase mt-1">Start paper-trading</h1>
            <p className="text-sm text-white/50 mt-2">Free forever. No card required for paper mode.</p>
          </div>

          <div className="space-y-3">
            <Field icon={<User size={14} />} label="name">
              <input data-testid="register-name" required value={form.name}
                     onChange={(e)=>setForm({...form,name:e.target.value})}
                     className="flex-1 bg-transparent py-3 text-sm outline-none" />
            </Field>
            <Field icon={<Mail size={14} />} label="email">
              <input data-testid="register-email" type="email" required value={form.email}
                     onChange={(e)=>setForm({...form,email:e.target.value})}
                     className="flex-1 bg-transparent py-3 text-sm outline-none" />
            </Field>
            <Field icon={<KeyRound size={14} />} label="password (min 6)">
              <input data-testid="register-password" type="password" required minLength={6} value={form.password}
                     onChange={(e)=>setForm({...form,password:e.target.value})}
                     className="flex-1 bg-transparent py-3 text-sm outline-none" />
            </Field>
          </div>

          {err && (
            <div data-testid="register-error" className="border border-[#FF3B30]/40 bg-[#FF3B30]/5 text-[#FF3B30] text-xs px-3 py-2 font-mono">{err}</div>
          )}

          <button
            data-testid="register-submit"
            type="submit"
            disabled={busy}
            className="w-full bg-[#007AFF] text-white py-3 font-display font-bold uppercase tracking-wider text-sm hover:bg-[#3395FF] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? "Creating…" : <>Create account <ArrowRight size={16} /></>}
          </button>

          <div className="text-xs text-white/50">
            Already registered? <Link to="/login" className="text-[#007AFF] hover:underline" data-testid="nav-to-login">Sign in</Link>
          </div>
        </form>
      </div>

      <div className="relative hidden md:block border-l border-white/10 order-1 md:order-2">
        <img
          src="https://images.unsplash.com/photo-1643962578896-ee17ec070d12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxjcnlwdG8lMjBtYXJrZXQlMjBncmFwaHMlMjBhYnN0cmFjdCUyMGRhcmt8ZW58MHx8fHwxNzc3MDA1MDI5fDA&ixlib=rb-4.1.0&q=85"
          alt="Trading"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-bl from-[#0a0a0a]/40 to-[#0a0a0a]" />
        <div className="relative p-10 h-full flex flex-col justify-end">
          <div className="font-display text-5xl font-black uppercase leading-none tracking-tighter">
            <span className="text-[#007AFF]">Control</span> your<br/>strategies.
          </div>
          <p className="mt-5 text-sm text-white/60 max-w-sm">Grid · Trend · Mean-Reversion · Breakout · Scalping — with Claude-powered sentiment.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</div>
      <div className="flex items-center gap-2 border border-white/10 bg-[#121212] px-3">
        <span className="text-white/40">{icon}</span>
        {children}
      </div>
    </label>
  );
}
