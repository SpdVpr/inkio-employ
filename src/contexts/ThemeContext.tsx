'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { updateUserProfile } from '@/lib/auth';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {}
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user, userProfile } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');

  // Initialize theme — default to LIGHT, only use dark if explicitly saved
  useEffect(() => {
    const stored = localStorage.getItem('inkio_theme') as Theme | null;
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored);
    } else if (userProfile?.theme === 'dark') {
      setThemeState('dark');
    }
    // No system preference detection — always default to light
  }, [userProfile?.theme]);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('inkio_theme', newTheme);
    
    // Persist to Firestore if logged in
    if (user) {
      updateUserProfile(user.uid, { theme: newTheme }).catch(console.error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
