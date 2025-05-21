
'use client';

import type { User, Role, AuthResponse } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true); // Start true: checking session
  const router = useRouter();
  const pathname = usePathname();

  const loadTokenAndUser = useCallback(async () => {
    console.log('[AuthContext] loadTokenAndUser: Initializing session state...');
    setLoading(true); // Explicitly set loading true at start of this specific async op
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('docuflow_jwt_token') : null;
    if (storedToken) {
      console.log('[AuthContext] loadTokenAndUser: Token found in localStorage.');
      setToken(storedToken);
      // User will be fetched by fetchCurrentUser if token exists and user is not yet set
    } else {
      console.log('[AuthContext] loadTokenAndUser: No token in localStorage.');
      // If no token, ensure user is null, and we are done with initial auth check for this path
      setUser(null);
      setToken(null);
    }
    setLoading(false); // Finished initial token check from localStorage
  }, []);


  useEffect(() => {
    loadTokenAndUser();
  }, [loadTokenAndUser]);


  const fetchCurrentUser = useCallback(async () => {
    const currentToken = typeof window !== 'undefined' ? localStorage.getItem('docuflow_jwt_token') : null;
    if (!currentToken) {
      console.log('[AuthContext] fetchCurrentUser: No token, cannot fetch user.');
      setUser(null);
      setToken(null); // Ensure token state is also null if localStorage is cleared elsewhere
      // setLoading(false); // loadTokenAndUser handles initial loading for no-token case
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
    // This effect runs when token changes, or after initial loadTokenAndUser if token was found
    // It also runs if loading changes AFTER initial load.
    console.log(`[AuthContext] Auth state check: token=${!!token}, user=${!!user}, loading=${loading}, pathname=${pathname}`);
    if (!loading && token && !user) {
      // Token exists (from localStorage or login), user not yet fetched, and initial loading done
      console.log('[AuthContext] Token exists, user not set, initial loading done. Fetching current user...');
      fetchCurrentUser();
    } else if (!loading && !token && !user) {
      // No token, no user, and initial loading is complete
      console.log(`[AuthContext] Pre-redirect check: pathname=${pathname}, loginPage=${pathname === '/login'}, callbackPage=${pathname.startsWith('/auth/callback')}`);
      if (pathname !== '/login' && !pathname.startsWith('/auth/callback')) {
        console.log('[AuthContext] No token/user, initial loading done, NOT on login/callback page. Redirecting to login from:', pathname);
        router.push('/login');
      } else {
        console.log('[AuthContext] No token/user, initial loading done, BUT on login/callback page. No redirect.');
      }
    }
  }, [token, user, loading, pathname, router, fetchCurrentUser]);


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
      router.push('/');
    } catch (error) {
      console.error('[AuthContext] Email/Password Login failed:', error);
      setUser(null);
      setToken(null);
      localStorage.removeItem('docuflow_jwt_token');
      setLoading(false); // Ensure loading is false on error
      throw error;
    }
    // setLoading(false) will be handled by the main useEffect reacting to token/user changes if successful
  };

  const loginWithTokenAndUser = (newToken: string, apiUser: any) => {
    console.log('[AuthContext] loginWithTokenAndUser called with user:', apiUser);
    setLoading(true); // Indicate that we are processing login
    const frontendUser: User = {
      ...apiUser,
      id: String(apiUser.id),
      avatarUrl: apiUser.avatarUrl || undefined,
    };
    localStorage.setItem('docuflow_jwt_token', newToken);
    setToken(newToken); // This will trigger the useEffect for auth state check
    setUser(frontendUser); // This will also trigger it
    console.log('[AuthContext] User logged in via OAuth token:', frontendUser);
    setLoading(false); // Now session is established, loading is false
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
      setLoading(false); // Logout complete, loading false
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
