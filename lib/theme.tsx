'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'auto';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', resolvedTheme: 'dark', toggle: () => {}, setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function getAutoTheme(): 'dark' | 'light' {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  const resolvedTheme = theme === 'auto' ? getAutoTheme() : theme;

  useEffect(() => {
    const saved = localStorage.getItem('vistoria_theme') as Theme | null;
    if (saved) setTheme(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('light', resolvedTheme === 'light');
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    localStorage.setItem('vistoria_theme', theme);
  }, [theme, resolvedTheme, mounted]);

  // Auto theme: check every minute
  useEffect(() => {
    if (theme !== 'auto' || !mounted) return;
    const interval = setInterval(() => {
      const auto = getAutoTheme();
      document.documentElement.classList.toggle('light', auto === 'light');
      document.documentElement.classList.toggle('dark', auto === 'dark');
    }, 60000);
    return () => clearInterval(interval);
  }, [theme, mounted]);

  const toggle = () => setTheme((t) => {
    if (t === 'dark') return 'light';
    if (t === 'light') return 'auto';
    return 'dark';
  });

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
