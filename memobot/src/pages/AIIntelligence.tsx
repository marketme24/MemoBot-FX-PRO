import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Brain, Cpu, Target, Zap, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "../contexts/LanguageContext";

export default function AIIntelligence() {
  const { t, f, language } = useLanguage();
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [optsApplied, setOptsApplied] = useState(false);
  const { data: verdict, isLoading: loadingVerdict, refetch: refetchVerdict } = trpc.ai.getMarketVerdict.useQuery({ symbol: selectedPair, lang: language });
  const { data: optimizations, isLoading: loadingOpts } = trpc.ai.getPortfolioOptimization.useQuery({ lang: language });

  const executeMutation = trpc.trading.execute.useMutation({
    onSuccess: (data: any) => {
      toast.success('AI-Optimized Strategy Executed', {
        description: `Position opened`
      });
    },
    onError: (err) => {
      toast.error('Execution Failed', {
        description: err.message
      });
    }
  });

  const handleExecuteAI = () => {
    if (!verdict) return;
    executeMutation.mutate({
      symbol: selectedPair.replace("/", ""),
      side: verdict.verdict === 'Bullish' ? 'buy' : 'sell',
      quantity: 0.05, 
      price: 65432.10,
      mode: 'paper'
    });
  };

  const handleRefetch = () => {
    toast.promise(refetchVerdict(), {
      loading: t('recalculatingMarketDna' as any),
      success: t('ensembleAnalysisComplete' as any),
      error: t('synapticLinkFailed' as any),
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-black text-primary italic tracking-tighter">AI <span className="text-primary">{t('intelligence' as any)}</span></h1>
          <p className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <Cpu size={12} className="text-primary animate-pulse" />
            {t('neuralNetworkPrediction' as any)}
          </p>
        </div>
        
        <div className="flex bg-black border border-white/10 rounded-xl p-1 gap-1">
          {["BTC/USDT", "ETH/USDT", "SOL/USDT"].map((pair) => (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest",
                selectedPair === pair ? "bg-blue-600 text-primary shadow-lg shadow-blue-500/20" : "text-gray-500 hover:text-primary/90"
              )}
            >
              {pair}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-[#050505]/90 border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Brain size={180} className="text-primary" />
          </div>
          
          <CardHeader className="border-b border-white/5 px-8 pt-8">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-3 text-primary">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                   <span className="text-sm font-black uppercase tracking-widest block">{t('ensembleVerdict' as any)}</span>
                   <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter mt-1 block">{t('indicatorAnalysisDesc' as any)}</span>
                </div>
              </CardTitle>
              <Button 
                onClick={handleRefetch}
                disabled={loadingVerdict}
                variant="ghost" 
                className="h-10 w-10 p-0 rounded-xl hover:bg-white/5 text-gray-400"
              >
                <RefreshCw size={16} className={cn(loadingVerdict && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={verdict?.verdict}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t('masterRating' as any)}</span>
                       <div className="flex items-center gap-1.5">
                         <span className="text-[9px] font-black text-primary uppercase">{t('confidence' as any)}</span>
                         <span className="text-sm font-mono font-black text-primary">{f(verdict?.confidence ?? 0)}%</span>
                       </div>
                    </div>
                    <h2 className={cn(
                      "text-6xl font-black italic tracking-tighter uppercase leading-none",
                      verdict?.verdict === "Bullish" ? "text-primary" : verdict?.verdict === "Bearish" ? "text-primary" : "text-primary"
                    )}>
                      {t((verdict?.verdict as any) || t('analyzing' as any))}
                    </h2>
                    <div className="mt-6 space-y-3">
                      {verdict?.reasons?.map((reason: string, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={cn("w-1 h-1 rounded-full", verdict?.verdict === "Bullish" ? "bg-emerald-500" : "bg-blue-500")} />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
                
                <p className="text-xs text-gray-500 leading-relaxed font-medium italic">
                  "{verdict?.summary}"
                </p>
              </div>

              <div className="flex justify-center relative">
                 <div className="w-48 h-48 rounded-full border-2 border-white/5 flex items-center justify-center relative">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-t-2 border-blue-500/30" 
                    />
                    <div className="text-center">
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('riskBias' as any)}</p>
                       <p className="text-2xl font-black text-primary italic tracking-tighter">{t('neutral' as any)}</p>
                    </div>
                    
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full blur-sm"
                    />
                 </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5">
               <Button 
                onClick={handleExecuteAI}
                disabled={executeMutation.isPending || verdict?.verdict === 'Neutral'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-primary font-black uppercase text-[10px] tracking-[0.2em] h-14 rounded-xl shadow-xl shadow-blue-500/20"
               >
                 {executeMutation.isPending ? t('processingSequence' as any) : t('executeOptimizedTrade' as any)}
               </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="bg-black/60 border-white/5 relative overflow-hidden group">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xs font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                   <Zap size={14} className="text-primary" />
                   {t('proprietaryOptimizations' as any)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {optimizations?.optimizations?.map((opt: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/20 transition-all cursor-pointer group/item">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest group-hover/item:text-primary transition-colors">{opt.title}</h4>
                      <div className="px-1.5 py-0.5 rounded bg-blue-500/10 text-primary text-[8px] font-black uppercase">Active</div>
                    </div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase leading-snug">{opt.description}</p>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-white/5">
                   <Button onClick={() => { setOptsApplied(true); toast.success(t('allOptimizationsApplied' as any) || 'All optimizations applied into memory matrix'); }} variant="outline" className={cn("w-full transition-all text-[10px] font-black uppercase tracking-widest h-11 rounded-xl border", optsApplied ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20" : "border-white/10 hover:bg-white/5")}>
                      {optsApplied ? 'OPTIMIZATIONS ACTIVE' : (t('applyAllOptimizations' as any) || 'APPLY ALL OPTIMIZATIONS')}
                   </Button>
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}