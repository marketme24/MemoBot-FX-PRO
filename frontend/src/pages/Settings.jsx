import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { useNavigate } from "react-router-dom";
import { User, Lock, Info, Key, LogOut, ShieldCheck, ShieldX, Save, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [tab, setTab] = useState("profile");
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [lockState, setLockState] = useState(null);
  const [about, setAbout] = useState(null);
  const [keys, setKeys] = useState(null);
  const [keyForm, setKeyForm] = useState({ api_key: "", api_secret: "" });
  const [saving, setSaving] = useState(false);

  const TABS = [
    { id: "profile", label: t("tab_profile"), icon: User },
    { id: "lock", label: t("tab_lock"), icon: Lock },
    { id: "about", label: t("tab_about"), icon: Info },
    { id: "keys", label: t("tab_keys"), icon: Key },
  ];

  useEffect(() => {
    api.get("/lock/state").then(({ data }) => setLockState(data));
    api.get("/config/about").then(({ data }) => setAbout(data));
    api.get("/user/exchange-keys").then(({ data }) => setKeys(data));
  }, []);

  const disableLock = async () => {
    await api.post("/lock/disable");
    toast.success("App lock disabled");
    const { data } = await api.get("/lock/state");
    setLockState(data);
  };

  const saveKeys = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/user/exchange-keys", keyForm);
      setKeys(data);
      setKeyForm({ api_key: "", api_secret: "" });
      toast.success(t("keys_saved"));
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">{t("settings_overline")}</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] bg-clip-text text-transparent">
          {t("settings_title")}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <aside className="md:col-span-1">
          <div className="border border-white/10 bg-[#121212]">
            {TABS.map((tg) => {
              const Icon = tg.icon;
              return (
                <button key={tg.id} data-testid={`settings-tab-${tg.id}`} onClick={() => setTab(tg.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-2 text-sm transition-colors ${
                    tab === tg.id ? "bg-white/5 text-white border-l-2 border-l-[#FFD27D]" : "text-white/60 hover:text-white"
                  }`}>
                  <Icon size={14} /> {tg.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="md:col-span-3">
          {tab === "profile" && (
            <div className="border border-white/10 bg-[#121212] p-6" data-testid="settings-profile">
              <h2 className="font-display text-2xl font-black uppercase">{t("tab_profile")}</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
                <Field label={t("profile_name")} value={user?.name} />
                <Field label={t("login_email")} value={user?.email} />
                <Field label={t("profile_role")} value={user?.role} />
                <Field label={t("profile_plan")} value={user?.subscription_plan} />
                <Field label={t("profile_registered")} value={user?.created_at ? new Date(user.created_at).toLocaleString() : "—"} />
              </div>
              <button data-testid="settings-logout" onClick={async ()=>{await logout();nav("/login");}}
                className="mt-6 inline-flex items-center gap-2 border border-[#FF3B30]/40 hover:bg-[#FF3B30]/10 text-[#FF3B30] px-4 py-2 text-xs font-mono uppercase tracking-wider">
                <LogOut size={14} /> {t("log_out")}
              </button>
            </div>
          )}

          {tab === "lock" && lockState && (
            <div className="border border-white/10 bg-[#121212] p-6 space-y-4" data-testid="settings-lock">
              <h2 className="font-display text-2xl font-black uppercase">{t("tab_lock")}</h2>
              <div className="flex items-center gap-2 text-sm">
                {lockState.pin_configured ? <ShieldCheck className="text-[#34C759]" size={18} /> : <ShieldX className="text-white/40" size={18} />}
                {lockState.pin_configured ? t("lock_status_on") : t("lock_status_off")}
                {lockState.biometric_enrolled && <span className="ml-3 text-[#FFD27D]">+ biometric</span>}
              </div>
              <div className="flex gap-2">
                <button data-testid="setup-pin" onClick={()=>nav("/app-lock?mode=setup")}
                  className="bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] text-black px-4 py-2 text-xs font-display font-bold uppercase tracking-widest">
                  {lockState.pin_configured ? t("change_pin") : t("setup_pin")}
                </button>
                {lockState.pin_configured && (
                  <button data-testid="disable-lock" onClick={disableLock}
                    className="border border-[#FF3B30]/40 hover:bg-[#FF3B30]/10 text-[#FF3B30] px-4 py-2 text-xs font-mono uppercase">
                    {t("disable_lock")}
                  </button>
                )}
              </div>
              <div className="font-mono text-[10px] text-white/40 pt-2">
                {t("auto_lock_note", { n: lockState.auto_lock_minutes || 5 })}
              </div>
            </div>
          )}

          {tab === "about" && about && (
            <div className="border border-white/10 bg-[#121212] p-6" data-testid="settings-about">
              <h2 className="font-display text-2xl font-black uppercase">{t("tab_about")}</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
                <Field label="bot name" value={about.bot_name} />
                <Field label="version" value={about.version} />
                <Field label="developer" value={about.developer} />
                <Field label="support" value={about.support_email} />
              </div>
              <p className="text-sm text-white/70 mt-4">{about.description}</p>
            </div>
          )}

          {tab === "keys" && keys && (
            <div className="border border-white/10 bg-[#121212] p-6 space-y-5" data-testid="settings-keys">
              <div>
                <h2 className="font-display text-2xl font-black uppercase">{t("keys_title")}</h2>
                <p className="text-sm text-white/50 mt-2">{t("keys_sub")}</p>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 border ${
                keys.mode === "live" ? "border-[#34C759]/40 bg-[#34C759]/5 text-[#34C759]" : "border-[#FFCC00]/40 bg-[#FFCC00]/5 text-[#FFCC00]"
              }`} data-testid="keys-mode-banner">
                {keys.mode === "live" ? <Check size={14} /> : <AlertTriangle size={14} />}
                <span className="font-mono text-xs uppercase tracking-widest">
                  {keys.mode === "live" ? t("live_mode") : t("paper_mode_label")}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
                <Field label="Current API Key" value={keys.api_key_mask || "—"} />
                <Field label="Secret" value={keys.has_secret ? "••••••••••••" : "—"} />
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">{t("binance_api_key")}</div>
                  <input data-testid="binance-api-key-input" value={keyForm.api_key}
                    onChange={(e) => setKeyForm({ ...keyForm, api_key: e.target.value })}
                    placeholder="Paste Binance API key"
                    className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">{t("binance_secret")}</div>
                  <input data-testid="binance-secret-input" type="password" value={keyForm.api_secret}
                    onChange={(e) => setKeyForm({ ...keyForm, api_secret: e.target.value })}
                    placeholder="Paste Binance secret"
                    className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono" />
                </div>
                <button data-testid="save-keys" onClick={saveKeys} disabled={saving}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] text-black px-4 py-2 text-xs font-display font-bold uppercase tracking-widest disabled:opacity-50">
                  <Save size={14} /> {saving ? t("saving") : t("save_keys")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Field({ label, value }) {
  return (
    <div className="border border-white/10 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-sm break-all">{value || "—"}</div>
    </div>
  );
}
