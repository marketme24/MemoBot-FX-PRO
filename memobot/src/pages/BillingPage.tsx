import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CreditCard, Check, ShieldCheck, Bitcoin, Wallet, Download, Lock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function BillingPage() {
  const { t, f, language } = useLanguage();
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = React.useState<string | null>(null);

  const handleConnect = (type: string) => {
    setConnecting(type);
    setTimeout(() => {
      setConnecting(null);
      setShowCheckoutModal(type);
    }, 800);
  };
  
  const finishCheckout = () => {
     setShowCheckoutModal(null);
     toast.success(`${showCheckoutModal} Authorized & Securely Bound`, {
         description: "Automated billing is now fully connected for performance fees."
     });
  };
  
  const plans = [
    { name: t('starter' as any), price: t('free' as any), type: 'recurring', color: "border-slate-800", fee: "0%", features: language === 'ar' ? ["وصول للتداول الورقي فقط", "رصيد تجريبي ١٠٠،٠٠٠ دولار", "تداول يدوي (بدون روبوت)", "تحليلات المشاعر الأساسية"] : ["Paper Trading Access Only", "$100,000 Demo Balance", "Manual Trading (No Bot)", "Basic Market Analytics"] },
    { name: t('professional' as any), price: "$49", type: 'recurring', color: "border-blue-500/30 bg-blue-500/5", fee: "2%", features: language === 'ar' ? ["٥ روبوتات", "تصفية مشاعر تلقائية", "مؤشرات SMC متقدمة", "تنفيذ أولوية ٢٤/٧"] : ["5 Bot Instances", "AI Sentiment Auto-Filter", "Advanced SMC Indicators", "24/7 Priority Execution"], recommended: true },
    { name: t('institutional' as any), price: "$199", type: 'recurring', color: "border-purple-500/30", fee: "0%", features: language === 'ar' ? ["روبوتات غير محدودة", "وصول API للمؤسسات", "بناء استراتيجيات مخصصة", "خادم مخصص"] : ["Unlimited Bot Instances", "Enterprise API Access", "Custom Strategy Builder", "Dedicated Server Node"] },
    { name: language === 'ar' ? "ترخيص مدى الحياة ميني" : "Lifetime Mini License", price: "$1000", type: 'onetime', color: "border-amber-500/30 bg-amber-500/5", fee: "1%", features: language === 'ar' ? ["روبوت واحد (محدود)", "جميع ميزات احترافي/مؤسسة", "خادم مخصص للمقاس الميني", "الدفع لمرة واحدة، وصول مدى الحياة"] : ["1 Bot Instance (Rate Limited)", "All Pro/Enterprise Features", "Dedicated Small Node", "One-Time Payment, Lifetime"] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary italic">{t('billing')} {f('&')} {t('subscription')}</h1>
          <p className="text-sm text-slate-410 mt-1 uppercase tracking-widest font-bold">{t('billingAndSubscriptionDesc' as any)}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open('/AuraBot_Pricing_Guide.pdf', '_blank')}
          className="border-emerald-500/20 text-primary bg-emerald-500/10 hover:bg-emerald-500/20"
        >
          <Download className="w-4 h-4 mr-2" />
          {language === 'ar' ? 'دليل الأسعار (PDF)' : 'Pricing Guide (PDF)'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, i) => (
          <Card key={i} className={cn("relative overflow-hidden transition-all hover:scale-[1.02]", plan.color)}>
            {plan.recommended && (
              <div className="absolute top-0 right-0 bg-blue-600 text-primary text-[10px] px-3 py-1 font-black uppercase tracking-tighter rounded-bl-lg">
                {t('recommended' as any)}
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-primary text-xl">{plan.name}</CardTitle>
              <p className="text-3xl font-bold text-primary mt-4 flex items-baseline gap-1">
                {plan.price === 'Free' || plan.price === t('free' as any) ? plan.price : `$${f(plan.price.replace('$', ''))}`} 
                {plan.type === 'recurring' && <span className="text-sm text-gray-500 font-normal">/{t('month' as any)}</span>}
              </p>
              <div className="mt-2 text-xs font-bold text-primary bg-emerald-500/10 inline-block px-2 py-1 rounded-md border border-emerald-500/20">
                {language === 'ar' ? `رسوم أداء ${plan.fee}` : `${plan.fee} Performance Fee`}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button onClick={() => { if(plan.price !== 'Free' && plan.price !== t('free' as any)) toast.success(language === 'ar' ? "تم بدء الترقية" : "Upgrade initiated"); }} className={cn("w-full py-6 font-bold", plan.recommended ? "bg-blue-600 hover:bg-blue-700" : "bg-white/5 border border-white/10 hover:bg-white/10")}>
                {plan.price === 'Free' || plan.price === t('free' as any) ? t('currentPlan') : t('upgrade')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-4">
        <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div>
          <h4 className="text-primary font-bold mb-1">{language === 'ar' ? 'نموذج الفوز المتبادل لرسوم الأداء' : 'Win-Win Performance Fee Model'}</h4>
          <p className="text-sm text-gray-400">
            {language === 'ar' 
              ? 'يتم تحصيل رسوم الأداء فقط على تداولاتك الرابحة في الحساب الحقيقي. لا توجد رسوم على التداولات الخاسرة. مما يضمن مواءمة نجاحنا مع نجاحك.' 
              : 'Performance fees are only charged on your profitable Live mode trades. If a trade is not profitable, no fee is applied. This aligns our success entirely with yours.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Card className="bg-[#050505]/50 border-white/5 p-6">
          <h3 className="text-primary font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            {t('paymentMethods' as any)}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Bitcoin className="text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">{t('cryptoCurrency' as any)}</p>
                  <p className="text-[10px] text-gray-500">{t('autoActivationDesc' as any)}</p>
                </div>
              </div>
              <Button onClick={() => handleConnect("Crypto")} disabled={connecting === "Crypto"} size="sm" variant="outline" className="border-white/10 text-primary">
                {connecting === "Crypto" ? (language === 'ar' ? 'جاري الربط...' : 'CONNECTING...') : (language === 'ar' ? 'ربط' : 'Connect')}
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">Telr / PayFort ({t('uaeGateways' as any)})</p>
                  <p className="text-[10px] text-gray-500">{t('aedDomesticSupport' as any)}</p>
                </div>
              </div>
              <Button onClick={() => handleConnect("Telr/PayFort")} disabled={connecting === "Telr/PayFort"} size="sm" variant="outline" className="border-white/10 text-primary font-bold text-primary">
                {connecting === "Telr/PayFort" ? "Redirecting..." : t('confirm')}
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Wallet className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">Stripe / PayPal</p>
                  <p className="text-[10px] text-gray-500">{t('globalCoverage' as any)}</p>
                </div>
              </div>
              <Button onClick={() => handleConnect("Stripe/PayPal")} disabled={connecting === "Stripe/PayPal"} size="sm" variant="outline" className="border-white/10 text-primary font-bold text-primary">
                {connecting === "Stripe/PayPal" ? "Redirecting..." : t('confirm')}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-emerald-600/5 border-emerald-600/20 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-primary font-bold text-lg mb-2">{t('secureTransactions' as any)}</h3>
          <p className="text-sm text-gray-400 max-w-[300px]">
             {t('secureTransactionsDesc' as any)}
          </p>
          <div className="mt-6 flex gap-4 text-[10px] text-gray-500 uppercase font-black">
            <span>PCI COMPLIANT</span>
            <span>AES-256</span>
            <span>AML VERIFIED</span>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {showCheckoutModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-black"
            >
              <div className="bg-gray-100 p-6 flex justify-between items-center border-b border-gray-200">
                 <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      Secure Authorization
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Auto-Billing Setup</p>
                 </div>
                 <button onClick={() => setShowCheckoutModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-8 pb-10 space-y-6">
                 <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-800 mb-4 shadow-inner">
                       {showCheckoutModal === 'Crypto' ? <Bitcoin size={32} className="text-orange-500" /> : <CreditCard size={32} />}
                    </div>
                    <p className="font-bold text-gray-700">Link {showCheckoutModal} Account</p>
                    <p className="text-xs text-gray-500 max-w-[280px] mx-auto">
                       By proceeding, you authorize AuraBot to automatically route {language === 'ar' ? 'رسوم الأداء' : 'performance fees'} from this method after a successful winning trade sequence based on your plan.
                    </p>
                 </div>
                 
                 {showCheckoutModal === 'Crypto' ? (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                       <p className="text-xs font-bold text-gray-500 uppercase mb-2">Deposit Address (USDT TRC20)</p>
                       <div className="bg-white p-3 rounded border border-gray-200 font-mono text-xs text-gray-800 text-center select-all">
                          TExSampleAddressForCryptoAutoBilling99
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Number</label>
                         <input type="text" placeholder="•••• •••• •••• ••••" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors font-mono" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry</label>
                           <input type="text" placeholder="MM/YY" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors font-mono" />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVC</label>
                           <input type="text" placeholder="•••" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors font-mono" />
                         </div>
                       </div>
                    </div>
                 )}

                 <Button onClick={finishCheckout} className="w-full py-6 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 rounded-xl">
                    Authorize & Connect
                 </Button>
                 
                 <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-2">
                    <ShieldCheck size={12} />
                    Secured by {showCheckoutModal === 'Telr/PayFort' ? 'PayFort' : showCheckoutModal === 'Stripe/PayPal' ? 'Stripe' : 'Chainalysis'}
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}