import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

export interface SettingsType {
  account: { profileName: string; profileEmail: string; region: "US" | "EU" | "APAC" | "OTHER"; timezone: string; };
  exchange: { defaultExchange: "binance" | "kraken" | "coinbase"; binanceApiKey: string; binanceApiSecret: string; testConnection: boolean; lastSuccessfulCall: Date | null; };
  trading: { masterMode: "paper" | "real"; defaultPair: string; orderSizeMode: "fixed" | "percentage"; defaultOrderSize: number; defaultLeverage: number; defaultTpPercentage: number; defaultSlPercentage: number; };
  bot: { scanIntervalSeconds: number; maxConcurrentStrategies: number; onErrorAction: "retry" | "pause" | "stop"; maxErrorRetries: number; };
  notifications: { emailNotifications: boolean; inAppNotifications: boolean; pushNotifications: boolean; events: { tradeExecuted: boolean; errorOccurred: boolean; riskBreached: boolean; subscriptionIssue: boolean; }; };
  advanced: { apiKeysVisible: boolean; webhookUrl: string; loggingVerbosity: "silent" | "minimal" | "normal" | "verbose"; };
}

export const DEFAULT_SETTINGS: SettingsType = {
  account: { profileName: "", profileEmail: "", region: "US", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  exchange: { defaultExchange: "binance", binanceApiKey: "", binanceApiSecret: "", testConnection: false, lastSuccessfulCall: null },
  trading: { masterMode: "paper", defaultPair: "BTCUSDT", orderSizeMode: "fixed", defaultOrderSize: 0.01, defaultLeverage: 1, defaultTpPercentage: 5, defaultSlPercentage: 2 },
  bot: { scanIntervalSeconds: 60, maxConcurrentStrategies: 5, onErrorAction: "retry", maxErrorRetries: 3 },
  notifications: { emailNotifications: true, inAppNotifications: true, pushNotifications: false, events: { tradeExecuted: true, errorOccurred: true, riskBreached: true, subscriptionIssue: true } },
  advanced: { apiKeysVisible: false, webhookUrl: "", loggingVerbosity: "normal" }
};

interface SettingsContextType {
  settings: SettingsType;
  isLoading: boolean;
  updateSettings: <K extends keyof SettingsType>(section: K, updates: Partial<SettingsType[K]>) => Promise<void>;
  updateSetting: <K extends keyof SettingsType, V extends keyof SettingsType[K]>(section: K, key: V, value: SettingsType[K][V]) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsType>(() => {
    const saved = localStorage.getItem("app_settings");
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("app_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback(async <K extends keyof SettingsType>(section: K, updates: Partial<SettingsType[K]>) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], ...updates } }));
  }, []);

  const updateSetting = useCallback(async <K extends keyof SettingsType, V extends keyof SettingsType[K]>(section: K, key: V, value: SettingsType[K][V]) => {
    await updateSettings(section, { [key]: value } as any);
  }, [updateSettings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("app_settings");
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}