import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { ApiService } from './api';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  token: string | null;
  userId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<User>;
  register: (data: {
    display_name: string;
    email: string;
    travel_style?: string;
    budget_band?: string;
    traveller_type?: string;
    pace?: string;
    interests?: string;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  token: null,
  userId: '',
  isAuthenticated: false,
  isLoading: true,
  login: async () => { throw new Error('AuthContext not initialized'); },
  register: async () => { throw new Error('AuthContext not initialized'); },
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('wandermatch_token');
    const savedUser = localStorage.getItem('wandermatch_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUserState(parsed);
        setToken(savedToken);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        localStorage.removeItem('wandermatch_token');
        localStorage.removeItem('wandermatch_user');
      }
    }
    setIsLoading(false);
  }, []);

  const setCurrentUser = (u: User | null) => {
    setCurrentUserState(u);
    if (u) {
      localStorage.setItem('wandermatch_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('wandermatch_user');
    }
  };

  const login = async (email: string): Promise<User> => {
    const res = await ApiService.login(email);
    setCurrentUser(res.user);
    setToken(res.token);
    localStorage.setItem('wandermatch_token', res.token);
    return res.user;
  };

  const register = async (data: {
    display_name: string;
    email: string;
    travel_style?: string;
    budget_band?: string;
    traveller_type?: string;
    pace?: string;
    interests?: string;
  }): Promise<User> => {
    const res = await ApiService.register(data);
    setCurrentUser(res.user);
    setToken(res.token);
    localStorage.setItem('wandermatch_token', res.token);
    return res.user;
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('wandermatch_token');
    localStorage.removeItem('wandermatch_user');
  };

  const userId = currentUser?.user_id || '';
  const isAuthenticated = !!currentUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        token,
        userId,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
