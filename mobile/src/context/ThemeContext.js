import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import storage from '../utils/storage';

const ThemeContext = createContext({ colorScheme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const system = useSystemColorScheme();
  const [override, setOverride] = useState(null); // null = follow system

  useEffect(() => {
    storage.getItem('theme_override').then(val => {
      if (val === 'dark' || val === 'light') setOverride(val);
    });
  }, []);

  const colorScheme = override ?? system ?? 'light';

  const toggleTheme = async () => {
    const next = colorScheme === 'dark' ? 'light' : 'dark';
    setOverride(next);
    await storage.setItem('theme_override', next);
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColorScheme() {
  return useContext(ThemeContext).colorScheme;
}

export function useToggleTheme() {
  return useContext(ThemeContext).toggleTheme;
}
