import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { trpc } from "../lib/trpc";
import { cn } from "../lib/utils";
import { ShieldCheck, ShieldAlert, Delete, Lock, Info, User, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { MemoBotIcon } from "./MemoBotIcon";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t, f, language } = useLanguage();
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<'pin' | 'email'>('pin');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const verifyPin = trpc.admin.verifyPin.useMutation();

  const handlePress = (num: string) => {
    if (mode !== 'pin') return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin.mutate({ pin: newPin }, {
          onSuccess: (data) => {
            if (data.success) {
              onUnlock();
            } else {
              setError(true);
              setPin("");
              setTimeout(() => setError(false), 500);
              toast.error(t('invalidPin' as any));
            }
          }
        });
      }
    }
  };

  const handleClear = () => setPin("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoggingIn(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success("Authentication successful");
        onUnlock();
      } else {
        toast.error("Invalid email or password");
        setIsLoggingIn(false);
      }
    } catch (err) {
      toast.error("Login Error");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020202] flex flex-col items-center justify-center font-inter select-none">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
      
      <div className="w-full max-w-sm px-8 space-y-12 relative z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-32 h-32 mx-auto flex items-center justify-center relative group select-none">
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                filter: [
                  "drop-shadow(0px 0px 8px rgba(59,130,246,0.1))",
                  "drop-shadow(0px 10px 20px rgba(59,130,246,0.5))",
                  "drop-shadow(0px 0px 8px rgba(59,130,246,0.1))"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full text-blue-500"
            >
              <MemoBotIcon className="w-full h-full" />
            </motion.div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary italic tracking-tighter uppercase">{t('memobotSecure' as any)}</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{t('terminalAccessRequired' as any)}</p>
          </div>
        </motion.div>

        {mode === 'pin' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className={cn(
                "flex justify-center gap-6 h-12 items-center transition-all",
                error && "animate-shake"
              )}>
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{ 
                      scale: pin.length > i ? 1 : 0.8,
                      backgroundColor: pin.length > i ? "var(--primary)" : "rgba(255,255,255,0.05)"
                    }}
                    className={cn(
                      "w-4 h-4 rounded-full border border-white/5 transition-all",
                      pin.length > i && "shadow-[0_0_15px_var(--primary-secondary)]"
                    )}
                  />
                ))}
              </div>
              <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] text-center">{t('authenticateSequence' as any)}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePress(num.toString())}
                  className="w-full aspect-square rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center justify-center text-xl font-black text-primary"
                >
                  {f(num)}
                </button>
              ))}
              <button
                 onClick={handleClear}
                 className="w-full aspect-square rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/20 active:scale-95 transition-all flex items-center justify-center text-[10px] font-black text-primary uppercase tracking-widest"
              >
                {t('clear' as any)}
              </button>
              <button
                onClick={() => handlePress("0")}
                className="w-full aspect-square rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center justify-center text-xl font-black text-primary"
              >
                {f(0)}
              </button>
              <div className="w-full aspect-square rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-800">
                 <ShieldCheck size={24} className="opacity-20" />
              </div>
            </div>
            
            <div className="pt-8 text-center border-t border-white/5 space-y-4">
               <button 
                 onClick={() => setMode('email')}
                 className="text-[10px] font-black text-primary hover:text-primary uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
               >
                 <User size={12} />
                 {t('signIn' as any)}
               </button>

               <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest leading-relaxed">
                 {language === 'ar' ? 'نظام تشفير AES-256 نشط' : 'AES-256 ENCRYPTION ACTIVE'}
               </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
             <form onSubmit={handleEmailLogin} className="space-y-4">
               <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Email Address</label>
                  <input 
                     type="email" 
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 text-primary font-mono text-sm outline-none focus:border-blue-500/50 transition-colors" 
                     placeholder="admin@example.com"
                     required
                     autoFocus
                  />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Password</label>
                  <input 
                     type="password" 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 text-primary font-mono text-sm outline-none focus:border-blue-500/50 transition-colors" 
                     placeholder="Enter your password"
                     required
                     minLength={8}
                  />
               </div>
               <button 
                  type="submit" 
                  disabled={isLoggingIn || !email || !password}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
               >
                 {isLoggingIn ? 'Authenticating...' : 'Sign In'}
                 {!isLoggingIn && <ArrowRight size={14} />}
               </button>
             </form>
             
             <div className="pt-6 text-center">
               <button 
                 onClick={() => setMode('pin')}
                 className="text-[10px] font-black text-gray-500 hover:text-primary uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
               >
                 Use Terminal PIN
               </button>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}