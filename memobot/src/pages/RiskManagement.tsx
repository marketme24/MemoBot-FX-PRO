import React from 'react';
import { trpc } from '../lib/trpc';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldAlert, AlertTriangle, Settings2, Activity, PlaySquare, Lock, Unplug, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function RiskManagement() {
  const { data: riskConfig, isLoading, refetch } = trpc.risk.getConfig.useQuery();
  const updateMut = trpc.risk.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Risk Protocol Re-Synchronized", {
        description: "Engines and Strategies are now governed by Master Risk DNA."
      });
      refetch();
    }
  });

  const { t, f } = useLanguage();
  const [detached, setDetached] = React.useState(false);

  React.useEffect(() => {
    if (riskConfig) {
       setDetached(!riskConfig.globalOverrideEnabled);
    }
  }, [riskConfig]);

  if (isLoading) return <div className="p-8 text-gray-400">SYNCING PROTOCOLS...</div>;

  const handleUpdate = (updates: any) => {
    if(!riskConfig) return;
    updateMut.mutate({ ...riskConfig, ...updates });
  };

  const handleEmergencyKill = () => {
    toast.error("EMERGENCY KILLSWITCH ACTIVATED", { description: "All active positions liquidated." });
  };

  const overrideEnabled = riskConfig?.globalOverrideEnabled;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-black text-primary italic tracking-tighter uppercase flex items-center gap-4">
             <ShieldAlert className="w-8 h-8 text-primary" />
             {t('riskProtocols' as any)}
          </h1>
          <p className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <Activity size={12} className="text-primary animate-pulse" />
            {t('activeSurveillance' as any)}
          </p>
        </div>

        <div className="flex items-center gap-4">
           {detached && (
              <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                 <AlertTriangle size={12} />
                 {t('manualOverrideActive' as any)}
              </div>
           )}
          <div className={cn("p-2 rounded-xl border flex items-center gap-3 transition-colors", overrideEnabled ? "bg-emerald-500/10 border-emerald-500/20" : "bg-black/40 border-white/5")}>
             <span className={cn("text-[10px] font-black uppercase tracking-widest px-2", overrideEnabled ? "text-primary" : "text-gray-500")}>
                {overrideEnabled ? t('globalOverrides' as any) : t('detached' as any)}
             </span>
             <Switch 
               checked={overrideEnabled} 
               onCheckedChange={v => {
                  handleUpdate({ globalOverrideEnabled: v });
                  if(!v) toast.warning(t('riskSyncDetached' as any));
               }} 
             />
          </div>
        </div>
      </div>

      <div className={cn("grid lg:grid-cols-3 gap-8 transition-opacity duration-500", !overrideEnabled && "opacity-50 pointer-events-none")}>
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#050505]/90 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
              <ShieldAlert size={140} className="text-primary" />
            </div>
            <CardHeader className="border-b border-white/5 px-8 pt-6 pb-4">
              <CardTitle className="flex items-center gap-3 text-primary">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                   <span className="text-xs font-black uppercase tracking-[0.2em] block">{t('automatedDrawdownProtection' as any)}</span>
                   <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter mt-1 block">{t('circuitBreakerLogic' as any)}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('maxSessionDrawdown' as any)}</label>
                  <span className="font-mono text-primary text-sm font-black bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{f(riskConfig?.maxDailyDrawdown || 0)}{f('%')}</span>
                </div>
                <Slider 
                  value={[riskConfig?.maxDailyDrawdown || 0]} 
                  onValueChange={v => handleUpdate({ maxDailyDrawdown: v[0] })}
                  max={20} min={1} step={1} 
                  className={cn("[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-500")}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                 <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('tailRiskHedging' as any)}</span>
                       <Switch checked={riskConfig?.hedgingEnabled} onCheckedChange={v => handleUpdate({ hedgingEnabled: v })} />
                    </div>
                 </div>
                 <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('smartRebalance' as any)}</span>
                       <Switch checked={riskConfig?.rebalanceOnExtremeVol} onCheckedChange={v => handleUpdate({ rebalanceOnExtremeVol: v })} />
                    </div>
                    <p className="text-[8px] text-gray-500 uppercase tracking-tighter font-bold leading-relaxed">{t('rebalanceDescription' as any)}</p>
                 </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-primary font-black uppercase text-[10px] tracking-[0.2em] h-10 px-6 rounded-xl shadow-lg shadow-emerald-500/20"
                onClick={() => toast.success(t('settingsSaved'))}>
                  {t('calibrateEmergencyCircuit' as any)}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
             <Card className="bg-[#050505]/80 border-white/5 overflow-hidden group">
                 <CardHeader className="bg-blue-500/5 pb-4 border-b border-blue-500/10">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('tier1Allocation' as any)}</CardTitle>
                    <p className="text-[8px] font-bold uppercase text-gray-600 tracking-tighter mt-1">{t('highFrequencyScalpingDna' as any)}</p>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('aggressive' as any)}</span>
                         <span className="font-mono text-primary text-sm font-black bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{f('60%')}</span>
                     </div>
                     <Slider value={[60]} disabled className="opacity-50 grayscale" />
                     <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('leverageCap' as any)}</span>
                        <div className="px-2 py-1 bg-white/5 rounded border border-white/10 font-mono text-xs text-primary font-black">20x</div>
                     </div>
                 </CardContent>
             </Card>
             <Card className="bg-[#050505]/80 border-white/5 overflow-hidden group">
                 <CardHeader className="bg-amber-500/5 pb-4 border-b border-amber-500/10">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('tier2Allocation' as any)}</CardTitle>
                    <p className="text-[8px] font-bold uppercase text-gray-600 tracking-tighter mt-1">{t('trendFollowingDna' as any)}</p>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('conservative' as any)}</span>
                         <span className="font-mono text-primary text-sm font-black bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{f('40%')}</span>
                     </div>
                     <Slider value={[40]} disabled className="opacity-50 grayscale" />
                     <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('leverageCap' as any)}</span>
                        <div className="px-2 py-1 bg-white/5 rounded border border-white/10 font-mono text-xs text-primary font-black">5x</div>
                     </div>
                 </CardContent>
             </Card>
          </div>
        </div>

        <div className="space-y-6">
           <Card className="bg-black/60 border-white/5 relative overflow-hidden">
               <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500" />
               <CardHeader className="pb-4">
                  <CardTitle className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                     <Settings2 className="w-4 h-4 text-gray-400" />
                     {t('syncEngineControl' as any)}
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  {[
                     { label: t('autoSyncStrategies' as any), desc: "Force strategies to follow global risk parameters." },
                     { label: t('globalProfitGuard' as any), desc: "Automatically trail stops across all deployed AI." },
                     { label: t('apiLatencyKillswitch' as any), desc: "Halt trading if Binance packet loss > 5%." },
                     { label: t('multiAccountMirror' as any), desc: "Replicate master account DNA to slave accounts." }
                  ].map((item, i) => (
                     <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                        <div>
                           <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">{item.label}</div>
                        </div>
                        <Switch defaultChecked={i < 2} />
                     </div>
                  ))}

                  <div className="pt-6 mt-6 border-t border-white/5">
                     <Button 
                        onClick={() => {
                           handleUpdate({ lastSync: new Date().toISOString() });
                           toast.success("Forced global resync initiated");
                        }}
                        variant="outline" className="w-full border-blue-500/20 text-primary hover:bg-blue-500/10 font-black text-[10px] uppercase tracking-widest h-12 rounded-xl">
                        {t('forceResyncAll' as any)}
                     </Button>
                     <p className="text-center text-[8px] text-gray-500 uppercase font-bold tracking-widest mt-3">
                        {t('syncVerifiedCount' as any)}
                     </p>
                  </div>
               </CardContent>
           </Card>

           <Card className="bg-rose-500/5 border-rose-500/20 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                 <Zap size={120} className="text-primary" />
              </div>
              <CardHeader className="pb-2 border-b border-rose-500/10 px-6 pt-5">
                 <CardTitle className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <Unplug className="w-4 h-4" />
                    {t('emergencyProtocol' as any)}
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 relative z-10">
                 <p className="text-[9px] text-primary/70 uppercase font-bold tracking-tighter leading-relaxed mb-6">
                    {t('instantlyCloseAll' as any)}
                 </p>
                 <Button 
                   onClick={handleEmergencyKill}
                   variant="destructive" 
                   className="w-full bg-rose-600 hover:bg-rose-700 text-primary font-black text-[11px] uppercase tracking-[0.3em] h-14 rounded-xl shadow-xl shadow-rose-500/20"
                 >
                    {t('executeKillConsole' as any)}
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}