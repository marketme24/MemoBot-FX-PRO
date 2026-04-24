import React, { useState } from "react";
import Layout from "../components/Layout";
import { useBot } from "../context/BotContext";
import { api } from "../lib/api";
import { Play, Square, RefreshCw, Volume2, VolumeX, Bell, BellOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function BotControl() {
  const { bot, controlBot, reload } = useBot();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const act = async (action) => {
    setBusy(true);
    try {
      const data = await controlBot(action);
      setLog((l) => [{ t: new Date().toLocaleTimeString(), msg: `[${action.toUpperCase()}] engine → ${data.status}` }, ...l].slice(0, 40));
      toast.success(`Engine ${action}ed`);
    } catch (e) {
      toast.error(`${action} failed`);
    } finally { setBusy(false); }
  };

  const toggleVoice = async () => {
    const { data } = await api.post("/bot/voice");
    toast.success(`Voice ${data.voice_enabled ? "enabled" : "disabled"}`);
    reload();
  };
  const toggleNotif = async () => {
    const { data } = await api.post("/bot/notifications");
    toast.success(`Notifications ${data.notifications_enabled ? "on" : "off"}`);
    reload();
  };

  const status = bot?.status || "STOPPED";
  const color = status === "RUNNING" ? "#34C759" : status === "ERROR" ? "#FF3B30" : "#71717A";

  return (
    <Layout>
      <div className="mb-6">
        <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">engine</div>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter uppercase">Bot Control</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main engine card */}
        <div className="lg:col-span-2 border border-white/10 bg-[#121212] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">current state</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="h-3 w-3 rounded-full pulse-dot" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                <span data-testid="bot-status-text" className="font-display text-3xl font-black tracking-tighter" style={{ color }}>{status}</span>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-white/40">
              <div>last restart: {bot?.last_restart ? new Date(bot.last_restart).toLocaleTimeString() : "—"}</div>
              <div>updated: {bot?.updated_at ? new Date(bot.updated_at).toLocaleTimeString() : "—"}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              data-testid="engine-start"
              onClick={() => act("start")}
              disabled={busy || status === "RUNNING"}
              className="py-5 bg-[#34C759]/10 border border-[#34C759]/30 hover:bg-[#34C759]/20 text-[#34C759] font-display font-black uppercase tracking-widest flex flex-col items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <Play size={22} /> Start
            </button>
            <button
              data-testid="engine-stop"
              onClick={() => act("stop")}
              disabled={busy || status === "STOPPED"}
              className="py-5 bg-[#FF3B30]/10 border border-[#FF3B30]/30 hover:bg-[#FF3B30]/20 text-[#FF3B30] font-display font-black uppercase tracking-widest flex flex-col items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <Square size={22} /> Stop
            </button>
            <button
              data-testid="engine-restart"
              onClick={() => act("restart")}
              disabled={busy}
              className="py-5 bg-[#007AFF]/10 border border-[#007AFF]/30 hover:bg-[#007AFF]/20 text-[#007AFF] font-display font-black uppercase tracking-widest flex flex-col items-center gap-2 disabled:opacity-40">
              <RefreshCw size={22} /> Restart
            </button>
          </div>

          {bot?.last_error && (
            <div className="mt-4 border border-[#FF3B30]/40 bg-[#FF3B30]/5 p-3 text-xs font-mono text-[#FF3B30] flex items-start gap-2">
              <AlertTriangle size={14} /> <div><b>Last error</b>: {bot.last_error}</div>
            </div>
          )}

          {/* Terminal-style log */}
          <div className="mt-6 bg-[#0a0a0a] border border-white/10 font-mono text-[11px] p-3 h-52 overflow-y-auto" data-testid="engine-log">
            <div className="text-white/30 mb-1">// engine console</div>
            {log.length === 0 && <div className="text-white/30">idle — no events yet.</div>}
            {log.map((l, i) => (
              <div key={i} className="text-[#34C759]/80">[{l.t}] {l.msg}</div>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="border border-white/10 bg-[#121212] p-5">
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">voice control</div>
            <h2 className="font-display text-xl font-bold uppercase mt-1">Voice alerts</h2>
            <p className="text-xs text-white/50 mt-1 mb-3">Speak executions, errors, and state changes aloud.</p>
            <button data-testid="toggle-voice" onClick={toggleVoice}
              className={`w-full inline-flex items-center gap-2 justify-center py-3 border font-display font-bold uppercase tracking-widest text-xs ${
                bot?.voice_enabled ? "bg-[#007AFF] border-[#007AFF]" : "border-white/10 hover:border-white/30"
              }`}>
              {bot?.voice_enabled ? <><Volume2 size={14} /> On</> : <><VolumeX size={14} /> Off</>}
            </button>
          </div>
          <div className="border border-white/10 bg-[#121212] p-5">
            <div className="font-mono text-[10px] text-white/40 tracking-[0.25em] uppercase">push</div>
            <h2 className="font-display text-xl font-bold uppercase mt-1">Notifications</h2>
            <p className="text-xs text-white/50 mt-1 mb-3">In-app alerts on every fill and error.</p>
            <button data-testid="toggle-notifications" onClick={toggleNotif}
              className={`w-full inline-flex items-center gap-2 justify-center py-3 border font-display font-bold uppercase tracking-widest text-xs ${
                bot?.notifications_enabled ? "bg-[#007AFF] border-[#007AFF]" : "border-white/10 hover:border-white/30"
              }`}>
              {bot?.notifications_enabled ? <><Bell size={14} /> On</> : <><BellOff size={14} /> Off</>}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
