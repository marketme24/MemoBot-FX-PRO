import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import { Mail, KeyRound, ArrowRight, Globe } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_quant-execution-pro/artifacts/hhbkndu5_MEMOBOT_ELEGANT_LOGO.png";

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useI18n();
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
      {/* Left hero with logo */}
      <div className="relative hidden md:flex border-r border-white/10 items-center justify-center p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] via-[#0a0a0a] to-[#0a0a0a]" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative text-center">
          <img src={LOGO_URL} alt="MEMOBOT FX-PRO PRIME" className="w-72 h-72 object-contain mx-auto" />
          <p className="mt-4 text-sm text-white/60 max-w-sm mx-auto">{t("login_hero_sub")}</p>
        </div>
        <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-widest text-white/40">
          v1.0 · paper-mode · coingecko · binance deep-links
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div className="flex items-center justify-between">
            <img src={LOGO_URL} alt="MEMOBOT" className="h-10 w-10 object-contain md:hidden" />
            <div className="ms-auto flex items-center gap-1 border border-white/10 p-0.5" data-testid="login-lang-toggle">
              <Globe size={11} className="text-white/40 mx-1.5" />
              <button type="button" onClick={() => setLang("en")} data-testid="login-lang-en"
                className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${lang === "en" ? "bg-white/10 text-white" : "text-white/50"}`}>EN</button>
              <button type="button" onClick={() => setLang("ar")} data-testid="login-lang-ar"
                className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${lang === "ar" ? "bg-white/10 text-white" : "text-white/50"}`}>ع</button>
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">{t("login_overline")}</div>
            <h1 className="font-display text-4xl font-black tracking-tighter uppercase mt-1 bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] bg-clip-text text-transparent">
              {t("login_title")}
            </h1>
            <p className="text-sm text-white/50 mt-2">
              {t("login_admin_hint")} <span className="font-mono text-[#FFD27D]">admin@memobot.com</span> / <span className="font-mono text-[#FFD27D]">Admin12345</span>
            </p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">{t("login_email")}</div>
              <div className="flex items-center gap-2 border border-white/10 bg-[#121212] px-3">
                <Mail size={14} className="text-white/40" />
                <input data-testid="login-email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="flex-1 bg-transparent py-3 text-sm outline-none" />
              </div>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">{t("login_password")}</div>
              <div className="flex items-center gap-2 border border-white/10 bg-[#121212] px-3">
                <KeyRound size={14} className="text-white/40" />
                <input data-testid="login-password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className="flex-1 bg-transparent py-3 text-sm outline-none" />
              </div>
            </label>
          </div>

          {err && (
            <div data-testid="login-error" className="border border-[#FF3B30]/40 bg-[#FF3B30]/5 text-[#FF3B30] text-xs px-3 py-2 font-mono">{err}</div>
          )}

          <button data-testid="login-submit" type="submit" disabled={busy}
            className="w-full bg-gradient-to-r from-[#FF3B30] to-[#FFD27D] text-black py-3 font-display font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? t("login_submit_busy") : <>{t("login_submit")} <ArrowRight size={16} /></>}
          </button>

          <div className="text-xs text-white/50">
            {t("login_no_account")} <Link to="/register" className="text-[#FFD27D] hover:underline" data-testid="nav-to-register">{t("login_go_register")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
