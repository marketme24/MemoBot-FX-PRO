import React, { useEffect, useRef } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "../contexts/LanguageContext";

export function AppLockOverlay({ onLocked }: { onLocked: () => void }) {
  const { data: status } = trpc.bot.status.useQuery(undefined, { refetchInterval: 30000 });
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("mousedown", handleActivity);

    const checkInterval = setInterval(() => {
      const lockTimeout = 5 * 60 * 1000; // 5 mins
      if (Date.now() - lastActivityRef.current > lockTimeout) {
        onLocked();
      }
    }, 10000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      clearInterval(checkInterval);
    };
  }, [onLocked]);

  return null;
}