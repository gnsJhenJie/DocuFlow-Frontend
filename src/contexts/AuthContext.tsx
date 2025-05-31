
'use client';

import type { User, Role, AuthResponse } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
const REDIRECT_PATH_KEY = 'docuflow_redirect_path';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const loadTokenAndUser = useCallback(async () => {
    console.log('[AuthContext] loadTokenAndUser: Initializing session state...');
    setLoading(true);
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('docuflow_jwt_token') : null;
    if (storedToken) {
      console.log('[AuthContext] loadTokenAndUser: Token found in localStorage.');
      setToken(storedToken);
    } else {
      console.log('[AuthContext] loadTokenAndUser: No token in localStorage.');
      setUser(null);
      setToken(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTokenAndUser();
  }, [loadTokenAndUser]);

  const fetchCurrentUser = useCallback(async () => {
    const currentToken = typeof window !== 'undefined' ? localStorage.getItem('docuflow_jwt_token') : null;
    if (!currentToken) {
      console.log('[AuthContext] fetchCurrentUser: No token, cannot fetch user.');
      setUser(null);
      setToken(null);
      return;
    }
    console.log('[AuthContext] fetchCurrentUser: Attempting to fetch user with token.');
    setLoading(true);
    try {
      const currentUserFromApi = await apiClient.getCurrentUser();
      const frontendUser: User = {
        ...currentUserFromApi,
        id: String(currentUserFromApi.id),
      };
      setUser(frontendUser);
      console.log('[AuthContext] fetchCurrentUser: Current user fetched successfully:', frontendUser);
    } catch (error) {
      console.error('[AuthContext] fetchCurrentUser: Failed to fetch current user:', error);
      localStorage.removeItem('docuflow_jwt_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log(`[AuthContext] Auth state check: token=${!!token}, user=${!!user}, loading=${loading}, pathname=${pathname}`);
    if (!loading && token && !user) {
      console.log('[AuthContext] Token exists, user not set, initial loading done. Fetching current user...');
      fetchCurrentUser();
    } else if (!loading && !token && !user) {
      console.log(`[AuthContext] Pre-redirect check: pathname=${pathname}, loginPage=${pathname === '/login'}, callbackPage=${pathname.startsWith('/auth/callback')}`);
      if (pathname !== '/login' && !pathname.startsWith('/auth/callback')) {
        const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        console.log(`[AuthContext] No token/user, initial loading done, NOT on login/callback page. Storing redirect path: ${fullPath} and redirecting to login from: ${pathname}`);
        localStorage.setItem(REDIRECT_PATH_KEY, fullPath);
        router.push('/login');
      } else {
        console.log('[AuthContext] No token/user, initial loading done, BUT on login/callback page. No redirect.');
      }
    }
  }, [token, user, loading, pathname, router, fetchCurrentUser, searchParams]);

  const handleSuccessfulLogin = () => {
    const redirectPath = localStorage.getItem(REDIRECT_PATH_KEY);
    if (redirectPath) {
      console.log(`[AuthContext] Redirecting to stored path: ${redirectPath}`);
      localStorage.removeItem(REDIRECT_PATH_KEY);
      router.push(redirectPath);
    } else {
      console.log('[AuthContext] No stored redirect path, redirecting to homepage.');
      router.push('/');
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
        id: String(apiUser.id),
        avatarUrl: apiUser.avatarUrl || undefined,
      };
      setUser(frontendUser);
      setToken(response.token);
      localStorage.setItem('docuflow_jwt_token', response.token);
      console.log('[AuthContext] User logged in (email/password):', frontendUser);
      handleSuccessfulLogin();
    } catch (error) {
      console.error('[AuthContext] Email/Password Login failed:', error);
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      throw error; // Rethrow for the login page to handle
    } finally {
      setLoading(false);
    }
  };

  const loginWithTokenAndUser = (newToken: string, apiUser: any) => {
    console.log('[AuthContext] loginWithTokenAndUser called with user:', apiUser);
    setLoading(true);
    const frontendUser: User = {
      ...apiUser,
      id: String(apiUser.id),
      avatarUrl: apiUser.avatarUrl || undefined,
    };
    localStorage.setItem('docuflow_jwt_token', newToken);
    setToken(newToken);
    setUser(frontendUser);
    console.log('[AuthContext] User logged in via OAuth token:', frontendUser);
    setLoading(false);
    handleSuccessfulLogin();
  };

  const logout = async () => {
    console.log('[AuthContext] User logout');
    setLoading(true);
    const currentToken = localStorage.getItem('docuflow_jwt_token');
    try {
      if (currentToken) {
        await apiClient.logout();
      }
    } catch (error) {
      console.error('[AuthContext] Logout API call failed, proceeding with client-side logout:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      localStorage.removeItem(REDIRECT_PATH_KEY); // Clear any stale redirect path on logout
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
