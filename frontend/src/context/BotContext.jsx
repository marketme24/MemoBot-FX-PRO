import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const BotContext = createContext(null);

export function BotProvider({ children }) {
  const { user } = useAuth();
  const [bot, setBot] = useState(null);
  const [tickers, setTickers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const loadBot = useCallback(async () => {
    if (!user || user === false) return;
    try {
      const { data } = await api.get("/bot/status");
      setBot(data);
    } catch (_) {}
  }, [user]);

  const loadTickers = useCallback(async () => {
    try {
      const { data } = await api.get("/market/tickers");
      setTickers(data);
    } catch (_) {}
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user || user === false) return;
    try {
      const { data } = await api.get("/notifications?limit=20");
      setNotifications(data);
    } catch (_) {}
  }, [user]);

  useEffect(() => {
    loadTickers();
    const t = setInterval(loadTickers, 15000);
    return () => clearInterval(t);
  }, [loadTickers]);

  useEffect(() => {
    if (user && user !== false) {
      loadBot();
      loadNotifications();
      const t = setInterval(() => {
        loadBot();
        loadNotifications();
      }, 20000);
      return () => clearInterval(t);
    }
  }, [user, loadBot, loadNotifications]);

  const controlBot = async (action) => {
    const { data } = await api.post("/bot/control", { action });
    setBot(data);
    return data;
  };

  return (
    <BotContext.Provider value={{
      bot, tickers, notifications, reload: loadBot,
      loadTickers, loadNotifications, controlBot,
    }}>
      {children}
    </BotContext.Provider>
  );
}

export const useBot = () => useContext(BotContext);
