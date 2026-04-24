import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, getToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // null = checking; false = not logged in; obj = logged in
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(false);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch (e) {
      setToken(null);
      setUser(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) setToken(data.access_token);
    setUser(data);
    return data;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    if (data.access_token) setToken(data.access_token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    setToken(null);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
