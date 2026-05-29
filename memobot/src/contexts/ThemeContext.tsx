import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'blue' | 'red' | 'yellow' | 'green' | 'purple' | 'white';

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: Record<ThemeColor, { 400: string; 500: string; 600: string; 700: string; primary: string; secondary: string; shadow: string }> = {
  blue: { 
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    primary: '#3b82f6', 
    secondary: 'rgba(59, 130, 246, 0.4)', 
    shadow: 'rgba(59, 130, 246, 0.2)' 
  },
  red: { 
    400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
    primary: '#ef4444', 
    secondary: 'rgba(239, 68, 68, 0.4)', 
    shadow: 'rgba(239, 68, 68, 0.2)' 
  },
  yellow: { 
    400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
    primary: '#eab308', 
    secondary: 'rgba(234, 179, 8, 0.4)', 
    shadow: 'rgba(234, 179, 8, 0.2)' 
  },
  green: { 
    400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
    primary: '#22c55e', 
    secondary: 'rgba(34, 197, 94, 0.4)', 
    shadow: 'rgba(34, 197, 94, 0.2)' 
  },
  purple: { 
    400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
    primary: '#a855f7', 
    secondary: 'rgba(168, 85, 247, 0.4)', 
    shadow: 'rgba(168, 85, 247, 0.2)' 
  },
  white: {
    400: '#f3f4f6', 500: '#e5e7eb', 600: '#d1d5db', 700: '#9ca3af',
    primary: '#f3f4f6',
    secondary: 'rgba(243, 244, 246, 0.4)',
    shadow: 'rgba(243, 244, 246, 0.2)'
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeColor) || 'blue';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    const root = document.documentElement;
    const colors = themes[theme];
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-secondary', colors.secondary);
    root.style.setProperty('--primary-shadow', colors.shadow);
    root.style.setProperty('--theme-400', colors[400]);
    root.style.setProperty('--theme-500', colors[500]);
    root.style.setProperty('--theme-600', colors[600]);
    root.style.setProperty('--theme-700', colors[700]);
  }, [theme]);

  const setTheme = (newTheme: ThemeColor) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}