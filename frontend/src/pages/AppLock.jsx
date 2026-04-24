import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { Lock, Fingerprint, Delete, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AppLock() {
  const [params] = useSearchParams();
  const mode = params.get("mode") || "verify";  // "setup" | "verify" | "lock"
  const nav = useNavigate();

  const [pin, setPin] = useState("");
  const [stage, setStage] = useState(mode === "setup" ? "enter" : "enter");
  const [firstPin, setFirstPin] = useState("");
  const [err, setErr] = useState("");
  const [state, setState] = useState(null);

  useEffect(() => {
    api.get("/lock/state").then(({ data }) => setState(data)).catch(() => {});
  }, []);

  const press = (d) => setPin((p) => (p.length < 6 ? p + d : p));
  const del = () => setPin((p) => p.slice(0, -1));

  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleSubmit = async () => {
    setErr("");
    try {
      if (mode === "setup") {
        if (stage === "enter") {
          setFirstPin(pin);
          setPin("");
          setStage("confirm");
          return;
        }
        if (pin !== firstPin) {
          setErr("PINs do not match. Try again.");
          setPin("");
          setFirstPin("");
          setStage("enter");
          return;
        }
        await api.post("/lock/set-pin", { pin });
        toast.success("App lock enabled");
        nav("/settings");
      } else {
        await api.post("/lock/verify", { pin });
        toast.success("Unlocked");
        nav("/dashboard");
      }
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || "Incorrect PIN");
      setPin("");
    }
  };

  const enrollBiometric = async () => {
    try {
      if (!window.PublicKeyCredential) {
        toast.error("WebAuthn not supported in this browser");
        return;
      }
      const avail = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!avail) {
        toast.error("No biometric authenticator available on this device");
        return;
      }
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "MEMOBOT FX-PRO" },
          user: {
            id: new TextEncoder().encode(state?.user_id || "memobot-user"),
            name: "user@memobot",
            displayName: "MEMOBOT User",
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
      <img
        src="https://images.unsplash.com/photo-1430276084627-789fe55a6da0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxwYXltZW50JTIwc2VjdXJpdHklMjBsb2NrJTIwZGFya3xlbnwwfHx8fDE3NzcwMDUwMjl8MA&ixlib=rb-4.1.0&q=85"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-15"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/80 to-[#0a0a0a]" />
      <div className="relative w-full max-w-sm mx-auto p-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 font-mono text-[10px] uppercase tracking-widest">
          <Shield size={12} /> secure entry
        </div>
        <h1 data-testid="app-lock-title" className="mt-6 font-display text-4xl font-black tracking-tighter uppercase">
          {mode === "setup" ? (stage === "enter" ? "Set 6-digit PIN" : "Confirm PIN") : "Enter PIN"}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          {mode === "setup" ? "This will lock your trading terminal." : "Unlock to resume trading."}
        </p>

        <div data-testid="pin-display" className="mt-8 flex justify-center gap-3 font-mono text-3xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-14 w-10 border-b-2 flex items-center justify-center ${
              pin[i] ? "border-[#007AFF] text-white" : "border-white/20 text-white/20"
            }`}>
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>

        {err && (
          <div data-testid="pin-error" className="mt-4 text-xs text-[#FF3B30] font-mono">{err}</div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} data-testid={`pin-key-${n}`} onClick={() => press(String(n))}
              className="h-14 border border-white/10 hover:border-[#007AFF] hover:bg-[#007AFF]/10 transition-colors font-mono text-xl">
              {n}
            </button>
          ))}
          <button data-testid="pin-biometric" onClick={enrollBiometric}
            className="h-14 border border-white/10 hover:border-[#007AFF] hover:bg-[#007AFF]/10 transition-colors flex items-center justify-center">
            <Fingerprint size={20} />
          </button>
          <button data-testid="pin-key-0" onClick={() => press("0")}
            className="h-14 border border-white/10 hover:border-[#007AFF] hover:bg-[#007AFF]/10 transition-colors font-mono text-xl">
            0
          </button>
          <button data-testid="pin-delete" onClick={del}
            className="h-14 border border-white/10 hover:border-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors flex items-center justify-center">
            <Delete size={20} />
          </button>
        </div>

        <div className="mt-6 text-[10px] font-mono uppercase tracking-widest text-white/40 flex items-center justify-center gap-2">
          <Lock size={10} /> encrypted · bcrypt · webauthn ready
        </div>
      </div>
    </div>
  );
}
