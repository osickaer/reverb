import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, type AppColors } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's stored preference */
  preference: ThemePreference;
  /** The resolved color scheme to use (never 'system') */
  colorScheme: ResolvedScheme;
  /** The resolved color palette */
  colors: AppColors;
  /** Cycle through preferences: system → light → dark → system */
  cycleTheme: () => void;
  /** Set a specific preference */
  setPreference: (pref: ThemePreference) => void;
}

const STORAGE_KEY = '@reverb_theme_preference';

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreferenceState(value);
      }
      setLoaded(true);
    });
  }, []);

  // Resolve the actual scheme
  const colorScheme: ResolvedScheme =
    preference === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : preference;

  const colors = getColors(colorScheme);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  const cycleTheme = useCallback(() => {
    setPreference(
      preference === 'system' ? 'light'
        : preference === 'light' ? 'dark'
          : 'system'
    );
  }, [preference, setPreference]);

  // Don't render until we've loaded the preference to avoid flash
  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ preference, colorScheme, colors, cycleTheme, setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}

/** Convenience hook that returns just the resolved color palette */
export function useThemeColors(): AppColors {
  return useAppTheme().colors;
}
