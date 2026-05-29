import React from 'react';
import { useLayout, FontFamily } from '../contexts/LayoutContext';
import { useTheme, ThemeColor, themes } from '../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Palette, Type, Image as ImageIcon, LayoutList, GripVertical, Eye, EyeOff } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { cn } from '../lib/utils';
import { View } from '../router';

export default function ThemeStudio() {
  const { settings, updateSetting } = useLayout();
  const { theme, setTheme } = useTheme();

  const handleSidebarReorder = (newOrder: string[]) => {
    updateSetting('sidebarOrder', newOrder);
  };

  const togglePanelVisibility = (id: string) => {
    if (settings.hiddenPanels.includes(id)) {
      updateSetting('hiddenPanels', settings.hiddenPanels.filter(p => p !== id));
    } else {
      updateSetting('hiddenPanels', [...settings.hiddenPanels, id]);
    }
  };

  const fonts: { id: FontFamily; label: string; fontFamily: string }[] = [
    { id: 'sans', label: 'Inter (OS)', fontFamily: 'Inter' },
    { id: 'mono', label: 'JetBrains', fontFamily: 'monospace' },
    { id: 'serif', label: 'Playfair', fontFamily: 'serif' },
    { id: 'orbitron', label: 'Orbitron', fontFamily: 'Orbitron' },
    { id: 'rajdhani', label: 'Rajdhani', fontFamily: 'Rajdhani' },
    { id: 'space', label: 'Grotesk', fontFamily: 'Space Grotesk' },
    { id: 'syncopate', label: 'Syncopate', fontFamily: 'Syncopate' },
    { id: 'audiowide', label: 'Audiowide', fontFamily: 'Audiowide' },
    { id: 'bruno', label: 'Bruno Ace', fontFamily: 'Bruno Ace' },
    { id: 'chakra', label: 'Chakra Petch', fontFamily: 'Chakra Petch' },
    { id: 'michroma', label: 'Michroma', fontFamily: 'Michroma' },
    { id: 'turret', label: 'Turret Road', fontFamily: 'Turret Road' },
  ];

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'market', label: 'Market Explorer' },
    { id: 'manual', label: 'Manual Trading' },
    { id: 'paper', label: 'Paper Trading' },
    { id: 'MEMOBOR', label: 'MEMOBOT' },
    { id: 'intelligence', label: 'AI Intelligence' },
    { id: 'strategies', label: 'Strategies' },
    { id: 'risk', label: 'Risk Management' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reports', label: 'Reports' },
    { id: 'comparison', label: 'Market Comparison' },
    { id: 'admin', label: 'Admin Terminal' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'settings', label: 'Settings' },
    { id: 'theme-studio', label: 'Theme Studio' }
  ];

  // We filter out any items not currently in sidebarOrder just in case, but rely on sidebarOrder to render Reorder.Group
  const orderedItems = settings.sidebarOrder
    .map(id => sidebarItems.find(item => item.id === id))
    .filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end gap-3 border-b border-white/5 pb-6">
        <Palette className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-black text-primary italic tracking-tighter uppercase">Theme Studio</h1>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">Configure layout, aesthetics & VFX</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appearance Configuration */}
        <div className="space-y-6">
           <Card className="bg-[#050505]/90 backdrop-blur-md border-white/5 relative overflow-hidden">
             <CardHeader className="border-b border-white/5 p-4 bg-white/[0.02]">
                <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-widest"><Type className="w-4 h-4" /> Typography & Colors</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
                 <div>
                    <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-widest">Global Font Family</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                       {fonts.map(font => (
                         <div 
                           key={font.id} 
                           onClick={() => updateSetting('fontFamily', font.id)}
                           className={cn(
                             "p-3 rounded-lg border text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[80px]",
                             settings.fontFamily === font.id 
                               ? "bg-blue-500/10 border-blue-500/50 text-primary" 
                               : "bg-black/50 border-white/10 text-gray-400 hover:border-white/30 hover:bg-white/5"
                           )}
                         >
                           <div className="text-2xl font-bold mb-2" style={{ fontFamily: font.fontFamily }}>Aa</div>
                           <div className="text-[9px] uppercase tracking-widest">{font.label}</div>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div>
                    <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-widest">Primary Accent Color</h4>
                    <div className="flex gap-4">
                      {(Object.keys(themes) as ThemeColor[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => setTheme(c)}
                          className={cn(
                            "w-10 h-10 rounded-xl border-2 transition-all hover:scale-110",
                            theme === c ? "border-white shadow-[0_0_15px_currentColor] scale-110" : "border-transparent opacity-50 hover:opacity-100"
                          )}
                          style={{ backgroundColor: themes[c].primary, color: themes[c].primary }}
                        />
                      ))}
                    </div>
                 </div>

                 <div>
                    <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-widest">App Logo</h4>
                    <div className="space-y-4">
                      <input 
                        type="text" 
                        value={settings.logoLabel}
                        onChange={(e) => updateSetting('logoLabel', e.target.value)}
                        placeholder="Text: e.g. FX_PRO, ALPHA, EXPERT"
                        className="w-full bg-[#000] border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-primary outline-none focus:border-blue-500/70"
                      />
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={settings.logoUrl || ''}
                          onChange={(e) => updateSetting('logoUrl', e.target.value)}
                          placeholder="Image URL (or pick a file)"
                          className="w-full bg-[#000] border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-primary outline-none focus:border-blue-500/70"
                        />
                        <label className="flex items-center justify-center bg-white/5 border border-white/10 rounded-lg px-4 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateSetting('logoUrl', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} />
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        </label>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] uppercase text-gray-500 tracking-widest">
                            <span>Image Size</span>
                            <span>{settings.logoImageSize || 100}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="50" 
                            max="300" 
                            value={settings.logoImageSize || 100}
                            onChange={(e) => updateSetting('logoImageSize', parseInt(e.target.value))}
                            className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] uppercase text-gray-500 tracking-widest">
                            <span>Text Size</span>
                            <span>{settings.logoTextSize || 100}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="50" 
                            max="200" 
                            value={settings.logoTextSize || 100}
                            onChange={(e) => updateSetting('logoTextSize', parseInt(e.target.value))}
                            className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                 </div>
             </CardContent>
           </Card>

           {/* Environment Effects */}
           <Card className="bg-[#050505]/90 backdrop-blur-md border-white/5 relative overflow-hidden">
             <CardHeader className="border-b border-white/5 p-4 bg-white/[0.02]">
                <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-widest"><ImageIcon className="w-4 h-4" /> Environment VFX</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
                 <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/40">
                   <div>
                     <div className="text-sm font-black text-primary uppercase tracking-wider">Background Mode</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest">Select visual style</div>
                   </div>
                   <select 
                     value={settings.backgroundMode || 'space'} 
                     onChange={(e) => updateSetting('backgroundMode', e.target.value as any)}
                     className="bg-[#000] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-primary outline-none focus:border-blue-500/70"
                   >
                     <option value="space">Hyperspace (Default)</option>
                     <option value="elegant">Elegant Aurora</option>
                     <option value="minimal">Minimal Static</option>
                      <option value="matrix">Matrix Rain</option>
                   </select>
                 </div>

                 <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/40">
                   <div>
                     <div className="text-sm font-black text-primary uppercase tracking-wider">Neutron Storms</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest">Toggle deep space background flashes</div>
                   </div>
                   <Switch checked={settings.spaceStorms} onCheckedChange={(c) => updateSetting('spaceStorms', c)} />
                 </div>
                 
                 <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/40">
                   <div>
                     <div className="text-sm font-black text-primary uppercase tracking-wider">Asteroid Field</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest">Render low-poly debris & rocks</div>
                   </div>
                   <Switch checked={settings.spaceRocks} onCheckedChange={(c) => updateSetting('spaceRocks', c)} />
                 </div>
             </CardContent>
           </Card>
        </div>

        {/* Sidebar Configuration */}
        <div className="space-y-6">
           <Card className="bg-[#050505]/90 backdrop-blur-md border-white/5 relative overflow-hidden h-[800px] flex flex-col">
             <CardHeader className="border-b border-white/5 p-4 bg-white/[0.02] shrink-0">
                <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2 tracking-widest">
                  <LayoutList className="w-4 h-4" /> Sidebar Architecture
                </CardTitle>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-2">Drag to reorder. Toggle visibility.</p>
             </CardHeader>
             <CardContent className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                <Reorder.Group axis="y" values={settings.sidebarOrder} onReorder={handleSidebarReorder} className="space-y-2">
                   {orderedItems.map((item) => {
                     const isVisible = !settings.hiddenPanels.includes(item.id);
                     return (
                       <Reorder.Item 
                         key={item.id} 
                         value={item.id} 
                         className={cn(
                           "flex justify-between items-center p-3 rounded-lg border transition-all cursor-move",
                           isVisible ? "bg-black/60 border-white/10" : "bg-black/30 border-white/5 opacity-50"
                         )}
                       >
                         <div className="flex items-center gap-3">
                           <GripVertical className="w-4 h-4 text-gray-600" />
                           <span className={cn("text-xs font-bold uppercase tracking-widest", isVisible ? "text-primary" : "text-gray-500")}>
                             {item.label}
                           </span>
                         </div>
                         <button 
                           onClick={(e) => { e.preventDefault(); togglePanelVisibility(item.id); }}
                           className="p-2 hover:bg-white/10 rounded-md text-gray-400 transition-colors"
                         >
                           {isVisible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-primary" />}
                         </button>
                       </Reorder.Item>
                     );
                   })}
                </Reorder.Group>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
