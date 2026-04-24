import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Lock, Bell, Info, Key, LogOut, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "lock", label: "App Lock", icon: Lock },
  { id: "about", label: "About Bot", icon: Info },
  { id: "keys", label: "API Keys", icon: Key },
];

export default function Settings() {
  const [tab, setTab] = useState("profile");
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [lockState, setLockState] = useState(null);
  const [about, setAbout] = useState(null);

  useEffect(() => {
    api.get("/lock/state").then(({ data }) => setLockState(data));
    api.get("/config/about").then(({ data }) => setAbout(data));
  }, []);

  const disableLock = async () => {
    await api.post("/lock/disable");
    toast.success("App lock disabled");
    const { data } = await api.get("/lock/state");
    setLockState(data);
  };

  return (
    <Layout>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">preferences</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <aside className="md:col-span-1">
          <div className="border border-white/10 bg-[#121212]">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} data-testid={`settings-tab-${t.id}`} onClick={() => setTab(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-2 text-sm transition-colors ${
                    tab === t.id ? "bg-white/5 text-white border-l-2 border-l-[#007AFF]" : "text-white/60 hover:text-white"
                  }`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="md:col-span-3">
          {tab === "profile" && (
            <div className="border border-white/10 bg-[#121212] p-6" data-testid="settings-profile">
              <h2 className="font-display text-2xl font-black uppercase">Profile</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
                <Field label="name" value={user?.name} />
                <Field label="email" value={user?.email} />
                <Field label="role" value={user?.role} />
                <Field label="subscription" value={user?.subscription_plan} />
                <Field label="registered" value={user?.created_at ? new Date(user.created_at).toLocaleString() : "—"} />
              </div>
              <button data-testid="settings-logout" onClick={async ()=>{await logout();nav("/login");}}
                className="mt-6 inline-flex items-center gap-2 border border-[#FF3B30]/40 hover:bg-[#FF3B30]/10 text-[#FF3B30] px-4 py-2 text-xs font-mono uppercase tracking-wider">
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}

          {tab === "lock" && lockState && (
            <div className="border border-white/10 bg-[#121212] p-6 space-y-4" data-testid="settings-lock">
              <h2 className="font-display text-2xl font-black uppercase">App Lock</h2>
              <div className="flex items-center gap-2 text-sm">
                {lockState.pin_configured ? <ShieldCheck className="text-[#34C759]" size={18} /> : <ShieldX className="text-white/40" size={18} />}
                {lockState.pin_configured ? "PIN configured" : "No PIN set"}
                {lockState.biometric_enrolled && <span className="ml-3 text-[#007AFF]">+ biometric</span>}
              </div>
              <div className="flex gap-2">
                <button data-testid="setup-pin" onClick={()=>nav("/app-lock?mode=setup")}
                  className="bg-[#007AFF] hover:bg-[#3395FF] px-4 py-2 text-xs font-display font-bold uppercase tracking-widest">
                  {lockState.pin_configured ? "Change PIN" : "Set up PIN"}
                </button>
                {lockState.pin_configured && (
                  <button data-testid="disable-lock" onClick={disableLock}
                    className="border border-[#FF3B30]/40 hover:bg-[#FF3B30]/10 text-[#FF3B30] px-4 py-2 text-xs font-mono uppercase">
                    Disable lock
                  </button>
                )}
              </div>
              <div className="font-mono text-[10px] text-white/40 pt-2">
                Auto-lock: {lockState.auto_lock_minutes || 5} minutes · lock on inactivity · lock on restart
              </div>
            </div>
          )}

          {tab === "about" && about && (
            <div className="border border-white/10 bg-[#121212] p-6" data-testid="settings-about">
              <h2 className="font-display text-2xl font-black uppercase">About Bot</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-sm">
                <Field label="bot name" value={about.bot_name} />
                <Field label="version" value={about.version} />
                <Field label="developer" value={about.developer} />
                <Field label="support" value={about.support_email} />
              </div>
              <p className="text-sm text-white/70 mt-4">{about.description}</p>
            </div>
          )}

          {tab === "keys" && (
            <div className="border border-white/10 bg-[#121212] p-6" data-testid="settings-keys">
              <h2 className="font-display text-2xl font-black uppercase">Exchange API Keys</h2>
              <p className="text-sm text-white/50 mt-2">Paper-trading mode active. Add real Binance keys to switch to live execution.</p>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Field label="Binance API Key" value="•••• •••• •••• ••••" />
                <Field label="Binance Secret" value="•••• •••• •••• ••••" />
                <Field label="Mode" value="paper-trading (simulated fills, real market data)" />
              </div>
              <div className="mt-4 border border-[#FFCC00]/40 bg-[#FFCC00]/5 p-3 text-xs text-[#FFCC00] font-mono">
                Live keys not yet connected. Provide your Binance API key + secret to enable real trading.
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
      <div className="mt-1 text-sm">{value || "—"}</div>
    </div>
  );
}
