// src/hooks/useTheme.js
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'shirtcraft_theme';

/**
 * useTheme — manages dark/light mode toggle.
 * Sets data-theme attribute on <html> and persists choice to localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    // Respect system preference on first visit
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  const isDark = theme === 'dark';

  return { theme, isDark, toggleTheme };
}
