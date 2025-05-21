
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
        try {
          // No need to fetch user here, fetchCurrentUser will be called if needed by components
          // or when token is set. We set loading to false after token check.
        } catch (error) {
          console.error('[AuthContext] Error fetching user on initial load:', error);
          localStorage.removeItem('docuflow_jwt_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    loadTokenAndUser();
  }, []);

  useEffect(() => {
    if (token && !user) { // If token exists but user is not set, try to fetch user
      fetchCurrentUser();
    }
  }, [token]); // Rerun when token changes

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
      console.log('[AuthContext] Current user fetched:', currentUser);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch current user:', error);
      // Token might be invalid, clear it
      localStorage.removeItem('docuflow_jwt_token');
      setToken(null);
      setUser(null);
      if (router && typeof window !== 'undefined' && window.location.pathname !== '/login') {
         router.push('/login'); // Redirect to login if fetching user fails
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
      if (isOAuth && oAuthUser) {
        // This is a simplified mock for OAuth. Real OAuth would involve redirects and backend handling.
        // For now, let's assume the backend has an endpoint or logic that can "login" an OAuth user
        // if they already exist, or create them. Here we simulate a direct login with user details.
        // This part needs to be aligned with actual OAuth backend implementation.
        // A more realistic mock would be to call a specific OAuth login endpoint.
        // Using the standard login for now, assuming backend handles it or we add a specific OAuth endpoint call.
         response = await apiClient.login({ email, password: password || "oauth_placeholder_password", name: oAuthUser.name, role: oAuthUser.role || role }); // Placeholder
      } else if (password) {
        response = await apiClient.login({ email, password });
      } else {
        throw new Error("Password is required for non-OAuth login.");
      }
      
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('docuflow_jwt_token', response.token);
      console.log('[AuthContext] User logged in:', response.user);
      router.push('/'); // Redirect after successful login
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      throw error; // Re-throw for the form to handle
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('[AuthContext] User logout');
    setLoading(true);
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('[AuthContext] Logout API call failed, proceeding with client-side logout:', error);
      // Even if API call fails, clear client-side session
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      setLoading(false);
      if (router) router.push('/login'); // Redirect to login after logout
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, fetchCurrentUser }}>
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
