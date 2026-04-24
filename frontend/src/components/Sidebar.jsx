import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Activity, CandlestickChart, GitBranch, ShieldAlert,
  TrendingUp, FileText, Radio, Power, CreditCard, Settings, LogOut, Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBot } from "../context/BotContext";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/trading", label: "Trading", icon: CandlestickChart, testid: "nav-trading" },
  { to: "/strategies", label: "Strategies", icon: GitBranch, testid: "nav-strategies" },
  { to: "/risk", label: "Risk & Protection", icon: ShieldAlert, testid: "nav-risk" },
  { to: "/analytics", label: "Analytics", icon: TrendingUp, testid: "nav-analytics" },
  { to: "/market", label: "Market Overview", icon: Radio, testid: "nav-market" },
  { to: "/reports", label: "Reports", icon: FileText, testid: "nav-reports" },
  { to: "/bot-control", label: "Bot Control", icon: Power, testid: "nav-bot-control" },
  { to: "/subscription", label: "Subscription", icon: CreditCard, testid: "nav-subscription" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { bot } = useBot();
  const navigate = useNavigate();

  const statusColor = bot?.status === "RUNNING" ? "#34C759" : bot?.status === "ERROR" ? "#FF3B30" : "#71717A";

  return (
    <aside data-testid="sidebar" className="w-64 shrink-0 border-r border-white/10 bg-[#0a0a0a] flex flex-col h-[calc(100vh-40px)] sticky top-[40px]">
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-[#007AFF] flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-black tracking-tight text-white leading-none">MEMOBOT</div>
            <div className="font-mono text-[9px] text-white/50 tracking-widest">FX-PRO v1.0</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
          <span className="h-2 w-2 rounded-full pulse-dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
          <span style={{ color: statusColor }}>{bot?.status || "STOPPED"}</span>
          <span className="text-white/30">· paper</span>
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
                    ? "bg-white/5 text-white border-l-2 border-[#007AFF] pl-3"
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
        <div className="flex items-center gap-2 px-2">
          <div className="h-7 w-7 rounded-sm bg-white/10 flex items-center justify-center font-mono text-xs">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs text-white truncate">{user?.email}</div>
            <div className="text-[10px] font-mono text-white/40 uppercase">{user?.subscription_plan || "free"} plan</div>
          </div>
        </div>
        <button
          data-testid="lock-app-btn"
          onClick={() => navigate("/app-lock?mode=lock")}
          className="w-full flex items-center gap-2 px-2 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors rounded-sm"
        >
          <Lock size={14} /> Lock app
        </button>
        <button
          data-testid="logout-btn"
          onClick={async () => { await logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2 px-2 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-[#FF3B30] transition-colors rounded-sm"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </aside>
  );
}
