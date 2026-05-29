import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // try to load from local storage
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    // In a real app we'd call the backend. Here we simulate.
    const isAdmin = email === 'maher.fekri1978@gmail.com' || email.includes('admin');
    
    // Check global usersMap simulated in router (this is frontend so we can't easily access memory map,
    // so we'll mock auth resolution for demo purposes)
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      name: email.split('@')[0],
      email,
      paperBalance: '100000',
      isPro: isAdmin,
      role: isAdmin ? 'admin' : 'user',
      status: 'active'
    };
    
    setUser(newUser);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
