'use client';

import type { User, Role } from '@/lib/types';
import { mockUsers } from '@/lib/mockData';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, role?: Role) => void; // Simplified login
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for an existing session
    // In a real app, this would involve checking localStorage or calling Firebase
    console.log('[AuthContext] Checking session');
    const storedUser = localStorage.getItem('docuflow_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email: string, role: Role = 'editor') => {
    console.log(`[AuthContext] User login attempt: ${email}, role: ${role}`);
    setLoading(true);
    // Simulate API call or Firebase auth
    setTimeout(() => {
      let foundUser = mockUsers.find(u => u.email === email);
      if (!foundUser) {
        // Create a new mock user if not found for demo purposes
        foundUser = { id: `mock-${Date.now()}`, email, name: email.split('@')[0], role, avatarUrl: 'https://placehold.co/100x100.png' };
      } else {
        // If found, assign the role passed or their default
        foundUser.role = role || foundUser.role;
      }
      
      setUser(foundUser);
      localStorage.setItem('docuflow_user', JSON.stringify(foundUser));
      console.log('[AuthContext] User logged in:', foundUser);
      setLoading(false);
    }, 500);
  };

  const logout = () => {
    console.log('[AuthContext] User logout');
    setLoading(true);
    // Simulate API call or Firebase auth
    setTimeout(() => {
      setUser(null);
      localStorage.removeItem('docuflow_user');
      setLoading(false);
    }, 300);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
