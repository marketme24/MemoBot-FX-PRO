import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { trpc } from '../lib/trpc';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Activity, Key, Shield, User, Globe, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings();
  const { t, f } = useLanguage();
  const [showKey, setShowKey] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  
  const testConnMut = trpc.trading.testExchangeConnection.useMutation({
    onSuccess: (data) => {
      toast.success(t('binanceConnectivityVerified' as any), { description: t('apiStatusOnline' as any) });
    },
    onError: (err) => {
      toast.error(t('synapticLinkFailed' as any), { description: err.message });
    }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary italic">{t('platformEngineering' as any)}</h1>
        <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-black">{t('coreSystemConfig' as any)}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-[#050505]/50 border-white/5">
          <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              {t('binanceConnection' as any)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('apiKey' as any)}</label>
              <div className="relative">
                <Input 
                  type={showKey ? "text" : "password"} 
                  value={settings.exchange.binanceApiKey} 
                  onChange={(e) => updateSetting("exchange", "binanceApiKey", e.target.value)} 
                  className="bg-black/50 border-white/10 text-primary font-mono h-11 pr-10"
                  placeholder="ex: XXXXXXXXXXXXXXXXXXXXX"
                />
                <button 
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">{t('requiredReadWrite' as any)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('apiSecret' as any)}</label>
                <div className="relative">
                  <Input 
                    type={showSecret ? "text" : "password"} 
                    value={settings.exchange.binanceApiSecret} 
                    onChange={(e) => updateSetting("exchange", "binanceApiSecret", e.target.value)} 
                    className="bg-black/50 border-white/10 text-primary font-mono h-11 pr-10"
                    placeholder="ex: YYYYYYYYYYYYYYYYYYYYY"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              <p className="text-[8px] text-primary/70 font-bold uppercase tracking-tighter">{t('neverShareKey' as any)}</p>
            </div>
            <div className="pt-4 flex gap-3">
              <Button onClick={() => toast.success(t('settingsSaved' as any))} className="bg-blue-600 hover:bg-blue-700 text-[10px] font-black uppercase tracking-widest flex-1">
                Save API
              </Button>
              <Button onClick={() => testConnMut.mutate({ apiKey: settings.exchange.binanceApiKey, apiSecret: settings.exchange.binanceApiSecret })} disabled={testConnMut.isPending} variant="outline" className="border-blue-500/20 text-primary hover:bg-blue-500/10 text-[10px] font-black uppercase tracking-widest">
                {testConnMut.isPending ? t('testing' as any) : t('testAuth' as any)}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#050505]/50 border-white/5">
          <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              {t('securityAndAppLock' as any)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div>
                <p className="text-sm font-bold text-primary">{t('pinProtection4digit' as any)}</p>
                <p className="text-xs text-gray-500">{t('requirePinDescription' as any)}</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('notifications' as any)}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary/90 font-bold">{t('email' as any)}</span>
                  <Switch checked={settings.notifications.emailNotifications} onCheckedChange={(v) => updateSetting("notifications", "emailNotifications", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary/90 font-bold">Push (Web)</span>
                  <Switch checked={settings.notifications.pushNotifications} onCheckedChange={(v) => updateSetting("notifications", "pushNotifications", v)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-[#050505]/50 border-white/5 mt-6">
          <CardHeader className="border-b border-white/5 bg-amber-500/5">
            <CardTitle className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Installation, Sharing & Features Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-primary border-b border-white/10 pb-2">How to Install & Share</h3>
                <ul className="space-y-3 text-xs text-gray-400">
                  <li><strong className="text-primary">Desktop Installation:</strong> Ensure you open the application URL in a supported browser (Chrome, Edge). Click the "Install App" or "Download icon" directly within your browser's address bar. This will create a native desktop app icon without terminal prompts or extra layers.</li>
                  <li><strong className="text-primary">Mobile Installation:</strong> On iOS, tap "Share" and "Add to Home Screen". On Android (Chrome), tap the menu and select "Install app".</li>
                  <li><strong className="text-primary">Sharing:</strong> To share AuraBot to your network or clients, use the "Share App" button available in the Admin Control page or simply send the direct URL. The single link holds the entire app context.</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-primary border-b border-white/10 pb-2">Platform Features Explained</h3>
                <ul className="space-y-3 text-xs text-gray-400">
                  <li><strong className="text-primary">Dashboard:</strong> Overview of your real-time performance, active open positions, and account aggregate balances.</li>
                  <li><strong className="text-primary">Bot Control:</strong> Core AI trader. Adjust risk levels, start/pause automated trading, and track real-time machine execution logs.</li>
                  <li><strong className="text-primary">Manual Trading:</strong> For users who need hands-on access. Bypass the bot to execute test or live trades instantly.</li>
                  <li><strong className="text-primary">Market Explorer:</strong> Browse high-potential crypto pairs filtered by AI sentiment, momentum, and smart-money divergence signals.</li>
                  <li><strong className="text-primary">AI Intelligence:</strong> Consult with an autonomous AI Agent for detailed chart breakdowns, correlation matrix, and real-time market sentiment updates.</li>
                  <li><strong className="text-primary">Risk Management:</strong> Configure your daily drawdown limits, stop-losses, and maximum position size sizing filters.</li>
                  <li><strong className="text-primary">Analytics & Reports:</strong> Export PDF/CSV reports and track deeper metrics like Sharpe ratio, profit factors, and trade duration.</li>
                  <li><strong className="text-primary">Admin Control:</strong> Only visible to Master nodes to govern users, set global limits, issue fee invoices, and manage sub-accounts.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}