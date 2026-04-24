import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { Lock, Fingerprint, Delete, Shield } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_quant-execution-pro/artifacts/hhbkndu5_MEMOBOT_ELEGANT_LOGO.png";

export default function AppLock() {
  const [params] = useSearchParams();
  const mode = params.get("mode") || "verify";
  const nav = useNavigate();

  const [pin, setPin] = useState("");
  const [stage, setStage] = useState("enter");
  const [firstPin, setFirstPin] = useState("");
  const [err, setErr] = useState("");
  const [state, setState] = useState(null);

  useEffect(() => {
    api.get("/lock/state").then(({ data }) => setState(data)).catch(() => {});
  }, []);

  const press = (d) => setPin((p) => (p.length < 6 ? p + d : p));
  const del = () => setPin((p) => p.slice(0, -1));

  useEffect(() => {
    if (pin.length === 6) handleSubmit();
    // eslint-disable-next-line
  }, [pin]);

  const handleSubmit = async () => {
    setErr("");
    try {
      if (mode === "setup") {
        if (stage === "enter") { setFirstPin(pin); setPin(""); setStage("confirm"); return; }
        if (pin !== firstPin) { setErr("PINs do not match"); setPin(""); setFirstPin(""); setStage("enter"); return; }
        await api.post("/lock/set-pin", { pin });
        toast.success("App lock enabled"); nav("/settings");
      } else {
        await api.post("/lock/verify", { pin });
        toast.success("Unlocked"); nav("/dashboard");
      }
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || "Incorrect PIN");
      setPin("");
    }
  };

  const enrollBiometric = async () => {
    try {
      if (!window.PublicKeyCredential) { toast.error("WebAuthn not supported"); return; }
      const avail = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!avail) { toast.error("No biometric authenticator available"); return; }
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "MEMOBOT FX-PRO" },
          user: {
            id: new TextEncoder().encode(state?.user_id || "memobot"),
            name: "user@memobot", displayName: "MEMOBOT User",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { userVerification: "required" },
          timeout: 60000,
        },
      });
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      await api.post("/lock/enroll-biometric", { credential_id: credId });
      toast.success("Biometric enrolled");
    } catch (e) {
      toast.error(e.message || "Biometric enrollment failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0000]/40 via-[#0a0a0a] to-[#0a0a0a]" />
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative w-full max-w-sm mx-auto p-6 text-center">
        <img src={LOGO_URL} alt="MEMOBOT" className="h-20 w-20 object-contain mx-auto mb-4" />
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 font-mono text-[10px] uppercase tracking-widest">
          <Shield size={12} /> secure entry
        </div>
        <h1 data-testid="app-lock-title" className="mt-5 font-display text-3xl font-black tracking-tighter uppercase">
          {mode === "setup" ? (stage === "enter" ? "Set 6-digit PIN" : "Confirm PIN") : "Enter PIN"}
        </h1>

        <div data-testid="pin-display" className="mt-8 flex justify-center gap-3 font-mono text-3xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-14 w-10 border-b-2 flex items-center justify-center ${
              pin[i] ? "border-[#FFD27D] text-white" : "border-white/20 text-white/20"
            }`}>{pin[i] ? "•" : ""}</div>
          ))}
        </div>

        {err && <div data-testid="pin-error" className="mt-4 text-xs text-[#FF3B30] font-mono">{err}</div>}

        <div className="mt-8 grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} data-testid={`pin-key-${n}`} onClick={() => press(String(n))}
              className="h-14 border border-white/10 hover:border-[#FFD27D] hover:bg-[#FFD27D]/10 transition-colors font-mono text-xl">{n}</button>
          ))}
          <button data-testid="pin-biometric" onClick={enrollBiometric}
            className="h-14 border border-white/10 hover:border-[#FFD27D] hover:bg-[#FFD27D]/10 transition-colors flex items-center justify-center"><Fingerprint size={20} /></button>
          <button data-testid="pin-key-0" onClick={() => press("0")}
            className="h-14 border border-white/10 hover:border-[#FFD27D] hover:bg-[#FFD27D]/10 transition-colors font-mono text-xl">0</button>
          <button data-testid="pin-delete" onClick={del}
            className="h-14 border border-white/10 hover:border-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors flex items-center justify-center"><Delete size={20} /></button>
        </div>

        <div className="mt-6 text-[10px] font-mono uppercase tracking-widest text-white/40 flex items-center justify-center gap-2">
          <Lock size={10} /> bcrypt · webauthn ready
        </div>
      </div>
    </div>
  );
}
