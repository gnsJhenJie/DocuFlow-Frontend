
'use client';

import type { User, Role, AuthResponse } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string, role?: Role, isOAuth?: boolean, oAuthUser?: Partial<User>) => Promise<void>;
  loginWithTokenAndUser: (token: string, apiUser: any) => void; // New method for OAuth
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // Initialize router

  useEffect(() => {
    const loadTokenAndUser = async () => {
      console.log('[AuthContext] Checking session');
      const storedToken = localStorage.getItem('docuflow_jwt_token');
      if (storedToken) {
        setToken(storedToken);
        // User will be fetched by fetchCurrentUser if token exists
      }
      setLoading(false); // Set loading false after initial token check
    };
    loadTokenAndUser();
  }, []);

  useEffect(() => {
    if (token && !user && !loading) { // If token exists but user is not set, and not initially loading
      fetchCurrentUser();
    }
  }, [token, user, loading]); // Rerun when token, user, or loading changes

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const currentUserFromApi = await apiClient.getCurrentUser();
      const frontendUser: User = {
        ...currentUserFromApi,
        id: String(currentUserFromApi.id), // Ensure ID is string
      };
      setUser(frontendUser);
      console.log('[AuthContext] Current user fetched:', frontendUser);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch current user:', error);
      localStorage.removeItem('docuflow_jwt_token');
      setToken(null);
      setUser(null);
      if (router && typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/auth/callback') {
         router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string, role?: Role, isOAuth: boolean = false, oAuthUser?: Partial<User>) => {
    console.log(`[AuthContext] User login attempt: ${email}, role: ${role}, isOAuth: ${isOAuth}`);
    setLoading(true);
    try {
      let response: AuthResponse;
      // Note: The generic login is kept for email/password, but true OAuth is handled by loginWithTokenAndUser
      if (isOAuth && oAuthUser) {
        // This path is less likely to be used if dedicated OAuth flow is implemented
        response = await apiClient.login({ email, password: password || "oauth_placeholder_password", name: oAuthUser.name, role: oAuthUser.role || role });
      } else if (password) {
        response = await apiClient.login({ email, password });
      } else {
        throw new Error("Password is required for non-OAuth login.");
      }
      
      const apiUser = response.user;
      const frontendUser: User = {
        ...apiUser,
        id: String(apiUser.id), // Ensure ID is string
      };
      setUser(frontendUser);
      setToken(response.token);
      localStorage.setItem('docuflow_jwt_token', response.token);
      console.log('[AuthContext] User logged in via email/password:', frontendUser);
      router.push('/');
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithTokenAndUser = (newToken: string, apiUser: any) => {
    setLoading(true);
    const frontendUser: User = {
      ...apiUser,
      id: String(apiUser.id), // Ensure ID is string
      // Ensure other fields match the User type, backend might not send all (e.g. avatarUrl might be null)
      avatarUrl: apiUser.avatarUrl || undefined, 
    };
    setUser(frontendUser);
    setToken(newToken);
    localStorage.setItem('docuflow_jwt_token', newToken);
    console.log('[AuthContext] User logged in via OAuth token:', frontendUser);
    setLoading(false);
    router.push('/'); // Redirect after successful OAuth login
  };


  const logout = async () => {
    console.log('[AuthContext] User logout');
    setLoading(true);
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('[AuthContext] Logout API call failed, proceeding with client-side logout:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      setLoading(false);
      if (router) router.push('/login');
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
