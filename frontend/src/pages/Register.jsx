import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import { Mail, KeyRound, User, ArrowRight } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_quant-execution-pro/artifacts/hhbkndu5_MEMOBOT_ELEGANT_LOGO.png";

export default function Register() {
  const { register } = useAuth();
  const { t } = useI18n();
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
              <img src={LOGO_URL} alt="MEMOBOT" className="h-10 w-10 object-contain" />
            </div>
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">{t("register_overline")}</div>
            <h1 className="font-display text-4xl font-black tracking-tighter uppercase mt-1 bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] bg-clip-text text-transparent">
              {t("register_title")}
            </h1>
            <p className="text-sm text-white/50 mt-2">{t("register_subtitle")}</p>
          </div>

          <div className="space-y-3">
            <Field icon={<User size={14} />} label={t("register_name")}>
              <input data-testid="register-name" required value={form.name}
                     onChange={(e)=>setForm({...form,name:e.target.value})}
                     className="flex-1 bg-transparent py-3 text-sm outline-none" />
            </Field>
            <Field icon={<Mail size={14} />} label={t("login_email")}>
              <input data-testid="register-email" type="email" required value={form.email}
                     onChange={(e)=>setForm({...form,email:e.target.value})}
                     className="flex-1 bg-transparent py-3 text-sm outline-none" />
            </Field>
            <Field icon={<KeyRound size={14} />} label={t("register_password_hint")}>
              <input data-testid="register-password" type="password" required minLength={6} value={form.password}
                     onChange={(e)=>setForm({...form,password:e.target.value})}
                     className="flex-1 bg-transparent py-3 text-sm outline-none" />
            </Field>
          </div>

          {err && (
            <div data-testid="register-error" className="border border-[#FF3B30]/40 bg-[#FF3B30]/5 text-[#FF3B30] text-xs px-3 py-2 font-mono">{err}</div>
          )}

          <button data-testid="register-submit" type="submit" disabled={busy}
            className="w-full bg-gradient-to-r from-[#FF3B30] to-[#FFD27D] text-black py-3 font-display font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? t("register_submit_busy") : <>{t("register_submit")} <ArrowRight size={16} /></>}
          </button>

          <div className="text-xs text-white/50">
            {t("register_already")} <Link to="/login" className="text-[#FFD27D] hover:underline" data-testid="nav-to-login">{t("register_go_login")}</Link>
          </div>
        </form>
      </div>

      <div className="relative hidden md:flex border-l border-white/10 order-1 md:order-2 items-center justify-center p-10">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#1a0000] via-[#0a0a0a] to-[#0a0a0a]" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative text-center">
          <img src={LOGO_URL} alt="MEMOBOT" className="w-72 h-72 object-contain mx-auto" />
          <p className="mt-4 text-sm text-white/60 max-w-sm mx-auto">{t("register_hero_sub")}</p>
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
