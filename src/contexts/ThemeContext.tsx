
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isThemeInitialized: boolean; // To know when client-side theme is determined
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with 'light' to match server render and avoid hydration issues.
  // Client-side effect will then determine the actual theme.
  const [theme, setThemeInternal] = useState<Theme>('light');
  const [isThemeInitialized, setIsThemeInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only on the client after mount.
    const storedTheme = localStorage.getItem('docuflow-theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let initialTheme: Theme = 'light';
    if (storedTheme) {
      initialTheme = storedTheme;
    } else if (systemPrefersDark) {
      initialTheme = 'dark';
    }
    
    setThemeInternal(initialTheme);
    setIsThemeInitialized(true); // Signal that client-side theme is now determined
  }, []);

  useEffect(() => {
    // This effect applies the theme class and updates localStorage.
    // It should only run after the initial theme has been determined on the client.
    if (!isThemeInitialized) return;

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('docuflow-theme', theme);
  }, [theme, isThemeInitialized]);

  const setTheme = useCallback((newTheme: Theme) => {
    // Allow theme changes only after initialization and on the client
    if (isThemeInitialized) {
      setThemeInternal(newTheme);
    }
  }, [isThemeInitialized]);
  
  const contextValue = {
    theme: theme, // Provide the current theme, even if it's the initial 'light' before client determination
    setTheme,
    isThemeInitialized,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};