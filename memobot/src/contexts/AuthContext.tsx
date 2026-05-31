import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trpc } from '../lib/trpc';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  paperBalance: string;
  isPro: boolean;
  role: UserRole;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      const authUser: User = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        paperBalance: '100000',
        isPro: result.user.role === 'admin',
        role: result.user.role,
        status: 'active',
      };
      setToken(result.token);
      setUser(authUser);
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      return true;
    } catch {
      return false;
    }
  }, [loginMutation]);

  const register = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await registerMutation.mutateAsync({ email, password });
      const role = result.user.role as UserRole;
      const authUser: User = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        paperBalance: '100000',
        isPro: role === 'admin',
        role,
        status: 'active',
      };
      setToken(result.token);
      setUser(authUser);
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      return true;
    } catch {
      return false;
    }
  }, [registerMutation]);

  const logout = useCallback(() => {
    if (token) {
      logoutMutation.mutate(undefined, {
        onSettled: () => {
          setUser(null);
          setToken(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        },
      });
    } else {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }, [token, logoutMutation]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user && !!token,
      token,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
