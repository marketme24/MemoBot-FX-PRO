import { MemoBotIcon } from './MemoBotIcon';
import React, { useState } from "react";
import { useLanguage, TranslationKey } from "../contexts/LanguageContext";
import { useTheme, ThemeColor, themes } from "../contexts/ThemeContext";
import { useLayout } from "../contexts/LayoutContext";
import { useAuth } from "../hooks/useAuth";
import { getComponentForView, View } from "../router";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { 
  BarChart3, Bot, LayoutDashboard, Settings as SettingsIcon, 
  ShieldAlert, TrendingUp, History, CreditCard, Brain, 
  Settings2, Activity, LogOut, Lock, Palette, ChevronRight, Menu, X, User,
  Globe, Terminal, Zap, ExternalLink, ShieldCheck, Search, Scale
} from "lucide-react";
import { PageBackground } from "./PageBackground";
import { TickerBar } from "./TickerBar";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

const ALL_NAV_ITEMS: Record<string, { label: string | TranslationKey, icon: any, pro?: boolean, admin?: boolean }> = {
  dashboard: { label: "dashboard", icon: LayoutDashboard },
  market: { label: "market", icon: Globe },
  manual: { label: "youTrade", icon: Search },
  paper: { label: "paperTrading", icon: Terminal },
  bot: { label: "botControl", icon: MemoBotIcon },
  intelligence: { label: "intelligence", icon: Brain, pro: true },
  strategies: { label: "strategies", icon: TrendingUp },
  risk: { label: "risk", icon: ShieldAlert },
  analytics: { label: "analytics", icon: BarChart3 },
  reports: { label: "reports", icon: History },
  comparison: { label: "Market Comparison", icon: Scale },
  admin: { label: "adminTerminal", icon: ShieldCheck, admin: true },
  subscription: { label: "subscription", icon: CreditCard },
  settings: { label: "settings", icon: SettingsIcon },
  'theme-studio': { label: "Theme Studio", icon: Palette },
};

export function Shell({ onLock }: { onLock: () => void }) {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { settings: layoutSettings, updateSetting, resetLayout } = useLayout();
  const { user, logout } = useAuth() as any;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Filter and order visible items
  const visibleNavItems = layoutSettings.sidebarOrder.filter(id => {
    if (layoutSettings.hiddenPanels.includes(id)) return false;
    const def = ALL_NAV_ITEMS[id];
    if (!def) return false;
    if (def.admin && user?.role !== 'admin') return false;
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-black antialiased">
      <PageBackground />
      
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 100 }}
        className="relative z-50 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col shadow-2xl transition-all duration-500 ease-in-out"
      >
        <div className="p-6 flex flex-col items-center justify-center mb-0 border-b border-blue-500/20 bg-gradient-to-b from-blue-950/40 to-black/80 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden group w-full">
           {/* Futuristic backdrop for the panel */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
           
           <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 right-4 z-20 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0 outline-none"
           >
             {isSidebarOpen ? <Menu className="w-5 h-5" /> : <ChevronRight className={cn("w-5 h-5 transition-transform", isSidebarOpen ? "rotate-180" : "")} />}
           </button>

           <div className="flex flex-col items-center gap-4 relative z-10 w-full overflow-hidden mt-2">
              <div className="relative flex items-center justify-center transition-transform hover:scale-105 shrink-0">
                {/* Tech background elements - enhanced visibility */}
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-500/40 transition-colors animate-pulse"></div>
                
                {/* Radar/tech static lines - reduced slightly */}
                <svg viewBox="0 0 100 100" className="absolute w-[110%] h-[110%] opacity-60 group-hover:opacity-100 transition-opacity animate-[spin_15s_linear_infinite]" style={{ pointerEvents: 'none', color: '#3b82f6' }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
                  <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 10" />
                  <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="10 5" opacity="0.5" />
                </svg>

                {layoutSettings.logoUrl ? (
                  <img 
                    src={layoutSettings.logoUrl} 
                    alt="Logo" 
                    className="w-14 h-14 md:w-16 md:h-16 relative z-10 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] origin-center" 
                    style={{ transform: `scale(${(layoutSettings.logoImageSize || 100) / 100})` }}
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <svg 
                    viewBox="0 0 100 80" 
                    className="w-14 h-14 md:w-16 md:h-16 drop-shadow-[0_0_15px_rgba(255,26,26,0.3)] relative z-10 origin-center"
                    style={{ transform: `scale(${(layoutSettings.logoImageSize || 100) / 100})` }}
                  >
                    <defs>
                       <linearGradient id="redBevel" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ff1a1a" />
                          <stop offset="20%" stopColor="#cc0000" />
                          <stop offset="80%" stopColor="#800000" />
                          <stop offset="100%" stopColor="#4d0000" />
                       </linearGradient>
                       <linearGradient id="goldBevel" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ffdf00" />
                          <stop offset="20%" stopColor="#ccaa00" />
                          <stop offset="80%" stopColor="#806600" />
                          <stop offset="100%" stopColor="#4d3d00" />
                       </linearGradient>
                       <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                         <feGaussianBlur stdDeviation="2" result="blur" />
                         <feComposite in="SourceGraphic" in2="blur" operator="over" />
                       </filter>
                    </defs>
                    
                    {/* Cyber wireframe underneath */}
                    <path d="M15 70 L15 15 L50 45 L50 65 L32 50 L32 70 Z" fill="none" stroke="#ff1a1a" strokeWidth="1" opacity="0.5" filter="url(#glow)"/>
                    <path d="M85 70 L85 15 L50 45 L50 65 L68 50 L68 70 Z" fill="none" stroke="#ffdf00" strokeWidth="1" opacity="0.5" filter="url(#glow)"/>

                    <path d="M15 70 L15 15 L50 45 L50 65 L32 50 L32 70 Z" fill="url(#redBevel)"/>
                    <path d="M15 15 L25 10 L50 35 L50 45 Z" fill="#ff4d4d"/>
                    <path d="M85 70 L85 15 L50 45 L50 65 L68 50 L68 70 Z" fill="url(#goldBevel)"/>
                    <path d="M85 15 L75 10 L50 35 L50 45 Z" fill="#ffdf00"/>
                    
                    {/* Tech overlay dot */}
                    <circle cx="50" cy="45" r="2" fill="#fff" filter="url(#glow)" />
                    <path d="M50 45 L50 80" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" strokeDasharray="1 2" />
                  </svg>
                )}
              </div>
              <AnimatePresence mode="wait">
                {isSidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col overflow-hidden items-center w-full"
                  >
                    {layoutSettings.logoLabel !== '' && (
                      <span 
                        className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 text-transparent bg-clip-text drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] italic tracking-tighter leading-tight whitespace-nowrap origin-center text-center w-full block"
                        style={{ transform: `scale(${(layoutSettings.logoTextSize || 100) / 100})` }}
                      >
                        {layoutSettings.logoLabel ?? "FX_PRO"}
                      </span>
                    )}
                    {layoutSettings.logoLabel !== '' && (
                      <span 
                        className="text-xs font-black tracking-[0.2em] uppercase opacity-80 origin-center text-center mt-1 block" 
                        style={{ 
                          color: themes[theme].primary,
                          transform: `scale(${(layoutSettings.logoTextSize || 100) / 100})` 
                        }}
                      >
                        FX PRO PRIME
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5 relative px-2">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.05] hidden md:block"></div>
            {visibleNavItems.map((id) => {
              const item = ALL_NAV_ITEMS[id];
              const active = currentView === id;
              const Icon = item.icon as any;
              
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCurrentView(id as View)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative overflow-hidden outline-none",
                        active ? "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] ml-2" : "hover:bg-white/5 border border-transparent hover:ml-1"
                      )}
                    >
                      <div className={cn(
                        "relative z-10 transition-colors bg-black/40 p-1.5 rounded-lg border border-white/5",
                        active ? "text-primary border-blue-500/40 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "text-gray-500 group-hover:text-primary group-hover:border-amber-500/30"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      {isSidebarOpen && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex-1 text-left relative z-10"
                        >
                          <span className={cn(
                            "text-xs md:text-sm font-bold uppercase tracking-[0.1em] transition-colors font-mono",
                            active ? "text-blue-100 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "text-gray-400 group-hover:text-primary"
                          )}>
                            {t(item.label as TranslationKey) || item.label}
                          </span>
                        </motion.div>
                      )}

                      {item.pro && isSidebarOpen && (
                        <span className="text-[7px] font-black bg-rose-500/10 text-primary border border-rose-500/20 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(244,63,94,0.3)] uppercase relative z-10 truncate">
                          PRO
                        </span>
                      )}
                      
                      {active && (
                        <motion.div 
                          layoutId="activeNav"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] rounded-r-full" 
                        />
                      )}

                      {/* Cyber overlay elements */}
                      {active && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                          <svg width="40" height="40" viewBox="0 0 100 100">
                            <path d="M50 20 L80 50 L50 80" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" />
                            <path d="M30 20 L60 50 L30 80" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" opacity="0.5" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  {!isSidebarOpen && (
                    <TooltipContent side="right" className="bg-black/90 text-white backdrop-blur-xl border-white/10 shadow-xl uppercase font-bold text-[10px] tracking-widest">
                      {t(item.label as TranslationKey) || item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </nav>

        <div className="p-4 space-y-2 border-t border-white/5 bg-black/20">
           {isSidebarOpen ? (
              <div className="space-y-4">
                 <div className="flex items-center gap-4 px-4 py-2 bg-white/5 rounded-xl border border-white/5 group hover:border-blue-500/20 transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-black text-primary">
                       {user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 overflow-hidden">
                       <p className="text-[10px] font-black text-primary uppercase truncate">{user?.name || t('trader' as any)}</p>
                       <p className="text-[8px] text-gray-500 truncate">{user?.email}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-between gap-1 px-1">
                    <button 
                      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[12px] font-black text-gray-400 transition-all uppercase flex-1"
                    >
                      {language === 'en' ? 'العربية' : 'English'}
                    </button>
                    <button 
                      onClick={onLock}
                      className="p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-primary transition-all flex items-center justify-center flex-1"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                         logout();
                      }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 transition-all flex items-center justify-center flex-1"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           ) : (
             <div className="flex flex-col items-center gap-4 py-2">
               <button onClick={() => setCurrentView('settings')} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"><User className="w-4 h-4" /></button>
               <button onClick={onLock} className="w-10 h-10 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 flex items-center justify-center text-primary border border-rose-500/10"><Lock className="w-4 h-4" /></button>
             </div>
           )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
         {/* Top Bar */}
         <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 relative z-40 shrink-0">
            <div className="flex items-center flex-1 min-w-0 mr-8">
               <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 gap-3 h-10 w-64 shrink-0 mr-6">
                  <Search className="w-3.5 h-3.5 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder={t('searchMarket' as any)} 
                    className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-primary placeholder:text-gray-600 flex-1 min-w-0"
                  />
                  <div className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-black text-gray-500">⌘K</div>
               </div>
               
               {/* Ticker starts right after search */}
               <div className="flex-1 min-w-0 h-full overflow-hidden">
                 <TickerBar />
               </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
               <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[10px] font-black text-primary tracking-tighter uppercase">{t('systemActive' as any)}</span>
                  </div>
               </div>
            </div>
         </header>

         {/* Scrollable Area */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={currentView}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                 >
                   {getComponentForView(currentView)}
                 </motion.div>
               </AnimatePresence>
            </div>
         </div>
         
         {/* Layout Editor Tools (if edit mode) */}
         {layoutSettings.isEditMode && (
            <motion.div 
               initial={{ y: 100 }}
               animate={{ y: 0 }}
               className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-xl border border-blue-400/30 p-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50 ring-4 ring-blue-500/20"
            >
               <div className="flex items-center gap-4 border-r border-white/20 pr-6 mr-2">
                  <Palette className="text-primary w-5 h-5" />
                  <span className="text-xs font-black text-primary uppercase tracking-widest">{t('themeEditor')}</span>
               </div>
               
               <div className="flex gap-3">
                  {(Object.keys(themes) as ThemeColor[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setTheme(c)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all active:scale-95",
                        theme === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100"
                      )}
                      style={{ backgroundColor: themes[c].primary }}
                    />
                  ))}
               </div>
               
               <div className="w-px h-6 bg-white/20" />
               
               <div className="flex items-center gap-3 bg-black/20 p-2 rounded-2xl border border-white/10">
                  <button onClick={() => updateSetting('fontSize', layoutSettings.fontSize - 5)} className="w-8 h-8 flex items-center justify-center font-bold text-primary hover:bg-white/10 rounded-lg">A-</button>
                  <span className="text-[10px] font-black text-primary w-10 text-center">{layoutSettings.fontSize}%</span>
                  <button onClick={() => updateSetting('fontSize', layoutSettings.fontSize + 5)} className="w-8 h-8 flex items-center justify-center font-bold text-primary hover:bg-white/10 rounded-lg">A+</button>
               </div>

               <div className="flex items-center gap-3">
                  <Button 
                    onClick={resetLayout}
                    size="sm" 
                    variant="ghost" 
                    className="text-primary font-black uppercase text-[10px] tracking-widest hover:bg-white/10"
                  >
                    {t('cancel' as any)}
                  </Button>
                  <Button 
                    onClick={() => updateSetting('isEditMode', false)}
                    size="sm" 
                    className="bg-white text-blue-600 font-black uppercase text-[10px] tracking-widest hover:bg-white/90 px-6 h-10 rounded-xl"
                  >
                    {t('done' as any)}
                  </Button>
               </div>
            </motion.div>
         )}
         
         {!layoutSettings.isEditMode && (
            <button 
              onClick={() => updateSetting('isEditMode', true)}
              className="fixed bottom-8 right-8 w-12 h-12 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 rounded-2xl flex items-center justify-center text-gray-500 hover:text-primary transition-all shadow-2xl z-40 group"
            >
              <Settings2 className="w-5 h-5 transition-transform group-hover:rotate-45" />
            </button>
         )}
      </main>
    </div>
  );
}