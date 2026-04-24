import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Activity, CandlestickChart, GitBranch, ShieldAlert,
  TrendingUp, FileText, Radio, Power, CreditCard, Settings, LogOut, Lock, Globe,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBot } from "../context/BotContext";
import { useI18n } from "../i18n/I18nContext";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_quant-execution-pro/artifacts/hhbkndu5_MEMOBOT_ELEGANT_LOGO.png";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { bot } = useBot();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const items = [
    { to: "/dashboard", label: t("nav_dashboard"), icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/trading", label: t("nav_trading"), icon: CandlestickChart, testid: "nav-trading" },
    { to: "/strategies", label: t("nav_strategies"), icon: GitBranch, testid: "nav-strategies" },
    { to: "/risk", label: t("nav_risk"), icon: ShieldAlert, testid: "nav-risk" },
    { to: "/analytics", label: t("nav_analytics"), icon: TrendingUp, testid: "nav-analytics" },
    { to: "/market", label: t("nav_market"), icon: Radio, testid: "nav-market" },
    { to: "/reports", label: t("nav_reports"), icon: FileText, testid: "nav-reports" },
    { to: "/bot-control", label: t("nav_bot"), icon: Power, testid: "nav-bot-control" },
    { to: "/subscription", label: t("nav_subscription"), icon: CreditCard, testid: "nav-subscription" },
    { to: "/settings", label: t("nav_settings"), icon: Settings, testid: "nav-settings" },
  ];

  const status = bot?.status;
  const statusColor = status === "RUNNING" ? "#34C759" : status === "ERROR" ? "#FF3B30" : "#71717A";
  const statusLabel = status === "RUNNING" ? t("running") : status === "ERROR" ? t("error") : t("stopped");

  return (
    <aside data-testid="sidebar" className="w-64 shrink-0 border-r border-white/10 bg-[#0a0a0a] flex flex-col h-[calc(100vh-40px)] sticky top-[40px]">
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="MEMOBOT" className="h-12 w-12 object-contain" />
          <div>
            <div className="font-display text-lg font-black tracking-tight leading-none bg-gradient-to-r from-[#FFD27D] to-[#FF3B30] bg-clip-text text-transparent">MEMOBOT</div>
            <div className="font-mono text-[9px] text-white/50 tracking-widest mt-0.5">FX-PRO PRIME</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
          <span className="h-2 w-2 rounded-full pulse-dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
          <span style={{ color: statusColor }}>{statusLabel}</span>
          <span className="text-white/30">· {t("paper_mode")}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={it.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 text-sm transition-colors rounded-sm ${
                  isActive
                    ? "bg-white/5 text-white border-l-2 border-[#FFD27D] pl-3"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon size={16} />
              {it.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-2">
        {/* Language toggle */}
        <div className="flex items-center gap-1 border border-white/10 p-0.5" data-testid="lang-toggle">
          <Globe size={12} className="text-white/40 mx-2" />
          <button
            data-testid="lang-en"
            onClick={() => setLang("en")}
            className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-widest ${lang === "en" ? "bg-white/10 text-white" : "text-white/50"}`}
          >EN</button>
          <button
            data-testid="lang-ar"
            onClick={() => setLang("ar")}
            className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-widest ${lang === "ar" ? "bg-white/10 text-white" : "text-white/50"}`}
          >ع</button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <div className="h-7 w-7 rounded-sm bg-white/10 flex items-center justify-center font-mono text-xs">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs text-white truncate">{user?.email}</div>
            <div className="text-[10px] font-mono text-white/40 uppercase">{user?.subscription_plan || "free"}</div>
          </div>
        </div>
        <button
          data-testid="lock-app-btn"
          onClick={() => navigate("/app-lock?mode=lock")}
          className="w-full flex items-center gap-2 px-2 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors rounded-sm"
        >
          <Lock size={14} /> {t("lock_app")}
        </button>
        <button
          data-testid="logout-btn"
          onClick={async () => { await logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2 px-2 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-[#FF3B30] transition-colors rounded-sm"
        >
          <LogOut size={14} /> {t("log_out")}
        </button>
      </div>
    </aside>
  );
}
