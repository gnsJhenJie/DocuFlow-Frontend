
'use client';

import type { User, Role, AuthResponse } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } // Updated import to include usePathname
from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string, role?: Role, isOAuth?: boolean, oAuthUser?: Partial<User>) => Promise<void>;
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
  const pathname = usePathname(); // Get current pathname

  useEffect(() => {
    const loadTokenAndUser = async () => {
      console.log('[AuthContext] Initializing session state...');
      const storedToken = localStorage.getItem('docuflow_jwt_token');
      if (storedToken) {
        setToken(storedToken);
        // User will be fetched by fetchCurrentUser if token exists, triggered by token state change
      } else {
        setLoading(false); // No token, so not loading user from token
      }
    };
    loadTokenAndUser();
  }, []);

  useEffect(() => {
    if (token && !user) { // If token exists but user is not set
      console.log('[AuthContext] Token found, fetching current user...');
      fetchCurrentUser();
    } else if (!token && !user && !loading) { // No token, no user, and initial load attempt finished
       // Only redirect if not on login or callback page
      if (pathname !== '/login' && pathname !== '/auth/callback') {
        console.log('[AuthContext] No token, redirecting to login from:', pathname);
        router.push('/login');
      }
    }
  }, [token, user, loading, pathname, router]); // Add pathname and router to dependencies

  const fetchCurrentUser = async () => {
    if (!token) { // Do not attempt to fetch if there's no token
      setLoading(false);
      setUser(null); // Ensure user is null if no token
       if (pathname !== '/login' && pathname !== '/auth/callback') {
        console.log('[AuthContext] fetchCurrentUser: No token, redirecting to login from:', pathname);
        router.push('/login');
      }
      return;
    }
    setLoading(true);
    try {
      const currentUserFromApi = await apiClient.getCurrentUser();
      const frontendUser: User = {
        ...currentUserFromApi,
        id: String(currentUserFromApi.id),
      };
      setUser(frontendUser);
      console.log('[AuthContext] Current user fetched:', frontendUser);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch current user:', error);
      localStorage.removeItem('docuflow_jwt_token');
      setToken(null); // This will trigger the useEffect above to redirect if needed
      setUser(null);
      // Redirect is handled by the useEffect hook based on token/user state
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string, role?: Role, isOAuth: boolean = false, oAuthUser?: Partial<User>) => {
    console.log(`[AuthContext] User login attempt: ${email}`);
    setLoading(true);
    try {
      let response: AuthResponse;
      if (password) { // Standard email/password login
        response = await apiClient.login({ email, password });
      } else {
        // This branch could be for an OAuth simulation or if backend supports passwordless with just email for certain flows.
        // Based on current frontend, it's for OAuth, where backend's /auth/google/callback is the actual login mechanism.
        // This generic `login` might not be directly called by a real OAuth flow initiated from frontend.
        // The OAuth flow should use `getGoogleAuthUrl` then callback page handles `exchangeGoogleCode` then `loginWithTokenAndUser`.
        // Keeping this for potential email-only login or testing, but primary OAuth is via dedicated methods.
        console.warn("[AuthContext] Login called without password, assuming special flow (e.g., OAuth placeholder)");
        // This path is unlikely to be hit by the Google OAuth flow now, which uses loginWithTokenAndUser.
        // If it were for a different type of OAuth or passwordless, backend API call would differ.
        // For now, assuming it's a fallback or test, we'd need a password or a different API.
        // Let's make it call login with a placeholder for now if oauthUser is present, though this is not ideal.
        if (isOAuth && oAuthUser) {
             response = await apiClient.login({ email, password: "OAUTH_PLACEHOLDER_PASSWORD", name: oAuthUser.name, role: oAuthUser.role || role});
        } else {
            throw new Error("Password is required for this login type, or OAuth user details missing.");
        }
      }
      
      const apiUser = response.user;
      const frontendUser: User = {
        ...apiUser,
        id: String(apiUser.id),
      };
      setUser(frontendUser);
      setToken(response.token); // This will trigger useEffect to fetch user if needed, or redirect.
      localStorage.setItem('docuflow_jwt_token', response.token);
      console.log('[AuthContext] User logged in (generic login):', frontendUser);
      router.push('/'); // Redirect after successful login
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
      id: String(apiUser.id),
      avatarUrl: apiUser.avatarUrl || undefined, 
    };
    setUser(frontendUser);
    setToken(newToken); // This will trigger useEffect.
    localStorage.setItem('docuflow_jwt_token', newToken);
    console.log('[AuthContext] User logged in via OAuth token:', frontendUser);
    setLoading(false); // Set loading false after user and token are set
    router.push('/'); // Redirect after successful OAuth login
  };


  const logout = async () => {
    console.log('[AuthContext] User logout');
    setLoading(true);
    const currentToken = localStorage.getItem('docuflow_jwt_token');
    try {
      if(currentToken) { // Only call API if token exists
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

