import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Activity, Mail, KeyRound, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("admin@memobot.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      nav(loc.state?.from?.pathname || "/dashboard");
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] grid md:grid-cols-2">
      {/* Left hero */}
      <div className="relative hidden md:block border-r border-white/10">
        <img
          src="https://images.unsplash.com/photo-1643962578896-ee17ec070d12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxjcnlwdG8lMjBtYXJrZXQlMjBncmFwaHMlMjBhYnN0cmFjdCUyMGRhcmt8ZW58MHx8fHwxNzc3MDA1MDI5fDA&ixlib=rb-4.1.0&q=85"
          alt="Trading terminal"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a]/60 to-[#0a0a0a]" />
        <div className="relative p-10 h-full flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-sm bg-[#007AFF] flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div className="font-display text-xl font-black tracking-tight">MEMOBOT FX-PRO</div>
          </div>
          <div>
            <div className="font-display text-4xl lg:text-5xl font-black uppercase leading-none tracking-tighter">
              Institutional<br/>trading.<br/>
              <span className="text-[#007AFF]">Autopilot.</span>
            </div>
            <p className="mt-5 text-sm text-white/60 max-w-sm">
              Paper-trading mode with live market data. Swap in your Binance API keys anytime to go live.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            v1.0 · paper-mode · coingecko feed · deep-links to binance
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">sign in</div>
            <h1 className="font-display text-4xl font-black tracking-tighter uppercase mt-1">Access your terminal</h1>
            <p className="text-sm text-white/50 mt-2">Admin quickstart: <span className="font-mono text-[#007AFF]">admin@memobot.com</span> / <span className="font-mono text-[#007AFF]">Admin12345</span></p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">email</div>
              <div className="flex items-center gap-2 border border-white/10 bg-[#121212] px-3">
                <Mail size={14} className="text-white/40" />
                <input
                  data-testid="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-transparent py-3 text-sm outline-none"
                />
              </div>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">password</div>
              <div className="flex items-center gap-2 border border-white/10 bg-[#121212] px-3">
                <KeyRound size={14} className="text-white/40" />
                <input
                  data-testid="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex-1 bg-transparent py-3 text-sm outline-none"
                />
              </div>
            </label>
          </div>

          {err && (
            <div data-testid="login-error" className="border border-[#FF3B30]/40 bg-[#FF3B30]/5 text-[#FF3B30] text-xs px-3 py-2 font-mono">
              {err}
            </div>
          )}

          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="w-full bg-[#007AFF] text-white py-3 font-display font-bold uppercase tracking-wider text-sm hover:bg-[#3395FF] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? "Authenticating…" : <>Enter terminal <ArrowRight size={16} /></>}
          </button>

          <div className="text-xs text-white/50">
            No account? <Link to="/register" className="text-[#007AFF] hover:underline" data-testid="nav-to-register">Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
