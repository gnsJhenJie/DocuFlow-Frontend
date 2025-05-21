
'use client';

import type { User, Role, AuthResponse } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } 
from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithTokenAndUser: (token: string, apiUser: any) => void;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); 

  useEffect(() => {
    const loadTokenAndUser = async () => {
      console.log('[AuthContext] Initializing session state...');
      const storedToken = localStorage.getItem('docuflow_jwt_token');
      if (storedToken) {
        setToken(storedToken);
        // User will be fetched by fetchCurrentUser if token exists
      } else {
        setLoading(false); 
      }
    };
    loadTokenAndUser();
  }, []);

  useEffect(() => {
    if (token && !user && !loading) { 
      console.log('[AuthContext] Token exists, user not set, not loading. Fetching current user...');
      fetchCurrentUser();
    } else if (!token && !user && !loading) { 
      if (pathname !== '/login' && !pathname.startsWith('/auth/callback')) {
        console.log('[AuthContext] No token/user, not loading, redirecting to login from:', pathname);
        router.push('/login');
      }
    }
  }, [token, user, loading, pathname, router]);

  const fetchCurrentUser = async () => {
    if (!token) {
      console.log('[AuthContext] fetchCurrentUser: No token, cannot fetch user.');
      setUser(null); // Ensure user is null
      setLoading(false);
      if (pathname !== '/login' && !pathname.startsWith('/auth/callback')) {
        console.log('[AuthContext] fetchCurrentUser: No token, redirecting to login from:', pathname);
        router.push('/login');
      }
      return;
    }
    console.log('[AuthContext] fetchCurrentUser: Attempting to fetch user with token.');
    setLoading(true);
    try {
      const currentUserFromApi = await apiClient.getCurrentUser();
      const frontendUser: User = {
        ...currentUserFromApi,
        id: String(currentUserFromApi.id), // Ensure ID is string
      };
      setUser(frontendUser);
      console.log('[AuthContext] Current user fetched successfully:', frontendUser);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch current user:', error);
      localStorage.removeItem('docuflow_jwt_token');
      setToken(null); 
      setUser(null);
      // Redirect handled by useEffect above
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string) => {
    console.log(`[AuthContext] User login attempt: ${email}`);
    setLoading(true);
    try {
      const response: AuthResponse = await apiClient.login({ email, password });
      
      const apiUser = response.user;
      const frontendUser: User = {
        ...apiUser,
        id: String(apiUser.id), // Ensure ID is string
        avatarUrl: apiUser.avatarUrl || undefined, 
      };
      setUser(frontendUser);
      setToken(response.token); 
      localStorage.setItem('docuflow_jwt_token', response.token);
      console.log('[AuthContext] User logged in (email/password):', frontendUser);
      router.push('/'); 
    } catch (error) {
      console.error('[AuthContext] Email/Password Login failed:', error);
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      throw error; // Re-throw for the login page to handle
    } finally {
      setLoading(false);
    }
  };

  const loginWithTokenAndUser = (newToken: string, apiUser: any) => {
    console.log('[AuthContext] loginWithTokenAndUser called with token and user:', apiUser);
    setLoading(true);
    const frontendUser: User = {
      ...apiUser,
      id: String(apiUser.id), // Ensure ID is string
      avatarUrl: apiUser.avatarUrl || undefined, 
    };
    setUser(frontendUser);
    setToken(newToken); 
    localStorage.setItem('docuflow_jwt_token', newToken);
    console.log('[AuthContext] User logged in via OAuth token:', frontendUser);
    setLoading(false); 
    router.push('/'); 
  };


  const logout = async () => {
    console.log('[AuthContext] User logout');
    setLoading(true);
    const currentToken = localStorage.getItem('docuflow_jwt_token');
    try {
      if(currentToken) { 
        await apiClient.logout();
      }
    } catch (error) {
      console.error('[AuthContext] Logout API call failed, proceeding with client-side logout:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      setLoading(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithTokenAndUser, logout, fetchCurrentUser }}>
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
