import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Settings as SettingsIcon, Monitor, Cpu, Database, Globe } from "lucide-react";
import { cn } from "../lib/utils";
import { getProviders, configureProvider, AIProviderInfo } from "../lib/ai";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "interface" | "ai" | "providers";

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");
  const [providers, setProviders] = useState<Record<string, { name: string; baseUrl: string; model: string }>>({});
  const [activeProviderInfo, setActiveProviderInfo] = useState<AIProviderInfo | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getProviders().then(data => {
        setProviders(data.providers);
        setActiveProviderInfo(data.active);
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    const config: { providerKey?: string; baseUrl?: string; apiKey?: string; model?: string } = {};
    if (selectedKey) config.providerKey = selectedKey;
    if (customUrl) config.baseUrl = customUrl;
    if (apiKey) config.apiKey = apiKey;
    if (customModel) config.model = customModel;

    const result = await configureProvider(config);
    if (result.success) {
      setActiveProviderInfo(result.active);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex h-[560px]">
              {/* Sidebar */}
              <div className="w-48 border-r border-zinc-800 bg-zinc-900/30 p-4">
                <div className="flex items-center gap-2 mb-8 px-2">
                  <SettingsIcon size={18} className="text-cyan-400" />
                  <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">Settings</span>
                </div>
                <div className="space-y-1">
                  <SettingTab icon={<Cpu size={14} />} label="AI Engine" active={activeTab === "ai"} onClick={() => setActiveTab("ai")} />
                  <SettingTab icon={<Globe size={14} />} label="Providers" active={activeTab === "providers"} onClick={() => setActiveTab("providers")} />
                  <SettingTab icon={<Monitor size={14} />} label="Interface" active={activeTab === "interface"} onClick={() => setActiveTab("interface")} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-200">
                    {activeTab === "ai" && "AI Engine Configuration"}
                    {activeTab === "providers" && "Supported Free Providers"}
                    {activeTab === "interface" && "Interface Configuration"}
                  </h3>
                  <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {activeTab === "ai" && (
                    <>
                      {/* Current Provider Status */}
                      {activeProviderInfo && (
                        <section>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Active Provider</h4>
                          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-zinc-400">Provider</span>
                              <span className="text-sm text-cyan-400 font-bold">{activeProviderInfo.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-zinc-400">Model</span>
                              <span className="text-xs text-zinc-300 font-mono">{activeProviderInfo.model}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-zinc-400">API Key</span>
                              <span className={cn("text-xs font-bold", activeProviderInfo.hasKey ? "text-green-400" : "text-yellow-400")}>
                                {activeProviderInfo.hasKey ? "Configured" : "Not Set"}
                              </span>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Provider Selection */}
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Switch Provider</h4>
                        <select
                          value={selectedKey}
                          onChange={(e) => {
                            setSelectedKey(e.target.value);
                            const p = providers[e.target.value];
                            if (p) {
                              setCustomUrl(p.baseUrl);
                              setCustomModel(p.model);
                            }
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 outline-none focus:border-cyan-500/50"
                        >
                          <option value="">-- Select a provider --</option>
                          {Object.entries(providers).map(([key, p]: [string, { name: string; baseUrl: string; model: string }]) => (
                            <option key={key} value={key}>{p.name}</option>
                          ))}
                        </select>
                      </section>

                      {/* API Key */}
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">API Key</h4>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter API key (leave blank for local providers like Ollama)"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 outline-none focus:border-cyan-500/50"
                        />
                        <p className="text-[10px] text-zinc-600 mt-1">Local providers (Ollama, LM Studio) don't need an API key.</p>
                      </section>

                      {/* Custom URL & Model */}
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Custom Endpoint</h4>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="Base URL (e.g. https://api.groq.com/openai/v1)"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 outline-none focus:border-cyan-500/50"
                          />
                          <input
                            type="text"
                            value={customModel}
                            onChange={(e) => setCustomModel(e.target.value)}
                            placeholder="Model name (e.g. llama-3.3-70b-versatile)"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 outline-none focus:border-cyan-500/50"
                          />
                        </div>
                      </section>
                    </>
                  )}

                  {activeTab === "providers" && (
                    <section>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                        Free & Open-Source AI Providers
                      </h4>
                      <p className="text-xs text-zinc-500 mb-4">
                        MEMOCODEX AI works with ANY OpenAI-compatible endpoint. Here are popular free options:
                      </p>
                      <div className="space-y-3">
                        {Object.entries(providers).map(([key, p]: [string, { name: string; baseUrl: string; model: string }]) => (
                          <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-zinc-200">{p.name}</span>
                              <span className="text-[10px] font-bold text-cyan-400 uppercase">
                                {key === "ollama" || key === "lmstudio" ? "Local / Free" : "Free Tier"}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 font-mono break-all">{p.baseUrl || "(configure URL)"}</div>
                            <div className="text-[10px] text-zinc-400 mt-1">Model: {p.model || "(configure model)"}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeTab === "interface" && (
                    <section>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Appearance</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-zinc-200">Theme Mode</p>
                            <p className="text-xs text-zinc-500">Switch between dark and light aesthetic</p>
                          </div>
                          <select className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500/50">
                            <option>Cyber Dark (Default)</option>
                            <option>Pure Black</option>
                            <option>Light Matrix</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-zinc-200">Font Size</p>
                            <p className="text-xs text-zinc-500">Adjust editor and UI text scale</p>
                          </div>
                          <input type="range" className="w-32 accent-cyan-500" />
                        </div>
                      </div>
                    </section>
                  )}
                </div>
                <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
                    CANCEL
                  </button>
                  {activeTab === "ai" && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                        saved ? "bg-green-500 text-black" : "bg-cyan-500 text-black hover:bg-cyan-400",
                        saving && "opacity-50"
                      )}
                    >
                      {saved ? "SAVED" : saving ? "SAVING..." : "SAVE CHANGES"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SettingTab = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all",
      active ? "bg-cyan-500/10 text-cyan-400" : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
    )}
  >
    {icon}
    <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
  </div>
);
