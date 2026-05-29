import React, { createContext, useContext, useState, useEffect } from 'react';

export type FontFamily = 'sans' | 'mono' | 'serif' | 'orbitron' | 'rajdhani' | 'space' | 'syncopate' | 'audiowide' | 'bruno' | 'chakra' | 'michroma' | 'turret';

interface LayoutSettings {
  fontSize: number;
  fontFamily: FontFamily;
  borderRadius: number;
  isEditMode: boolean;
  panelOrder: string[];
  logoLabel: string;
  logoUrl: string;
  logoImageSize: number;
  logoTextSize: number;
  spaceRocks: boolean;
  spaceStorms: boolean;
  backgroundMode: 'space' | 'elegant' | 'minimal' | 'matrix';
  hiddenPanels: string[];
  sidebarOrder: string[];
}

interface LayoutContextType {
  settings: LayoutSettings;
  updateSetting: <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => void;
  resetLayout: () => void;
}

const defaultSettings: LayoutSettings = {
  fontSize: 100,
  fontFamily: 'sans',
  borderRadius: 12,
  isEditMode: false,
  panelOrder: ['ibrain', 'stats', 'chart', 'activity'],
  logoLabel: 'FX_PRO',
  logoUrl: '',
  logoImageSize: 100,
  logoTextSize: 100,
  spaceRocks: false,
  spaceStorms: true,
  backgroundMode: 'space',
  hiddenPanels: [],
  sidebarOrder: [
    'dashboard', 'live-trading', 'market',
    'manual', 'paper', 'bot',
    'intelligence', 'strategies', 'risk',
    'analytics', 'reports', 'comparison',
    'admin', 'subscription', 'settings', 'theme-studio'
  ],
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<LayoutSettings>(() => {
    const saved = localStorage.getItem('app-layout-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const panelOrder = [...(parsed.panelOrder || [])];
        defaultSettings.panelOrder.forEach(id => {
          if (!panelOrder.includes(id)) {
            panelOrder.push(id);
          }
        });
        return { ...defaultSettings, ...parsed, panelOrder };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('app-layout-settings', JSON.stringify(settings));
    const root = document.documentElement;
    root.style.setProperty('--base-font-size', `${settings.fontSize}%`);
    root.style.setProperty('--base-radius', `${settings.borderRadius}px`);
    const fontMap = { 
      sans: "'Inter', sans-serif", 
      mono: "'JetBrains Mono', monospace", 
      serif: "'Playfair Display', serif",
      orbitron: "'Orbitron', sans-serif",
      rajdhani: "'Rajdhani', sans-serif",
      space: "'Space Grotesk', sans-serif",
      syncopate: "'Syncopate', sans-serif",
      audiowide: "'Audiowide', sans-serif",
      bruno: "'Bruno Ace', sans-serif",
      chakra: "'Chakra Petch', sans-serif",
      michroma: "'Michroma', sans-serif",
      turret: "'Turret Road', sans-serif"
    };
    root.style.setProperty('--base-font-family', fontMap[settings.fontFamily]);
    document.body.style.fontFamily = fontMap[settings.fontFamily];
    document.body.style.fontSize = `${settings.fontSize}%`;
  }, [settings]);

  const updateSetting = <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetLayout = () => {
    setSettings(defaultSettings);
  };

  return (
    <LayoutContext.Provider value={{ settings, updateSetting, resetLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}