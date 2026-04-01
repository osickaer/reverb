/**
 * Reverb Design System
 *
 * Central source of truth for all visual tokens used across the app.
 * Import from this file instead of hardcoding values in individual screens.
 *
 * Usage:
 *   import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
 */

// ─── Light Colors ────────────────────────────────────────────────────────────

export const LightColors = {
  // Primary brand color — iOS blue
  primary: '#007AFF',

  // Semantic
  correct: '#34C759',   // iOS green
  incorrect: '#FF3B30', // iOS red
  warning: '#FF9500',   // iOS orange

  // Backgrounds
  background: '#F2F2F7',      // iOS grouped background (light gray)
  surface: '#FFFFFF',         // Cards, sheets
  surfaceAlt: '#F8F9FA',      // Subtle alt surface (choice buttons, tags)

  // Text
  textPrimary: '#1C1C1E',     // Near-black
  textSecondary: '#3A3A3C',   // Dark gray
  textTertiary: '#8E8E93',    // Muted gray
  textInverse: '#FFFFFF',

  // Borders & dividers
  border: '#dee2e6',
  divider: '#F2F2F7',

  // Tab bar
  tint: '#007AFF',
  tabIconDefault: '#8E8E93',
  tabIconSelected: '#007AFF',
};

// ─── Dark Colors ─────────────────────────────────────────────────────────────

export const DarkColors = {
  // Primary brand color — slightly brighter for dark backgrounds
  primary: '#0A84FF',

  // Semantic
  correct: '#30D158',
  incorrect: '#FF453A',
  warning: '#FF9F0A',

  // Backgrounds
  background: '#000000',
  surface: '#1C1C1E',
  surfaceAlt: '#2C2C2E',

  // Text
  textPrimary: '#F2F2F7',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  textInverse: '#000000',

  // Borders & dividers
  border: '#38383A',
  divider: '#2C2C2E',

  // Tab bar
  tint: '#0A84FF',
  tabIconDefault: '#8E8E93',
  tabIconSelected: '#0A84FF',
};

// ─── Color type ──────────────────────────────────────────────────────────────

export type AppColors = typeof LightColors;

/** Get the color palette for a given color scheme */
export function getColors(scheme: 'light' | 'dark'): AppColors {
  return scheme === 'dark' ? DarkColors : LightColors;
}

// ─── Legacy static export (for code that hasn't migrated to useThemeColors) ─
// Defaults to light for backward compatibility
export const Colors = {
  ...LightColors,

  // Legacy — kept for @react-navigation/native ThemeProvider
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#007AFF',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#007AFF',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

// ─── Typography ───────────────────────────────────────────────────────────────

export const FontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const LineHeight = {
  tight: 18,
  normal: 22,
  relaxed: 26,
};

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screen: 24,   // Standard horizontal padding for full-width screens
};

// ─── Border Radius ────────────────────────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

// ─── Shadows (iOS-style) ──────────────────────────────────────────────────────

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
};

// ─── Common StyleSheet fragments ─────────────────────────────────────────────
// Reusable style objects you can spread into StyleSheet.create blocks.
// NOTE: These use LightColors for backwards compat. Prefer useThemeColors() in screens.

export const CommonStyles = {
  /** Full-screen centered container (loading states, simple screens) */
  screenContainer: {
    flex: 1,
    backgroundColor: LightColors.background,
  },
  /** Centered overlay (loading spinners, error states) */
  centered: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: LightColors.background,
  },
  /** White card with standard radius and shadow */
  card: {
    backgroundColor: LightColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  /** Section title */
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: LightColors.textPrimary,
    marginBottom: Spacing.base,
  },
  /** Muted body text */
  bodyText: {
    fontSize: FontSize.base,
    color: LightColors.textSecondary,
    lineHeight: LineHeight.normal,
  },
  /** Small uppercase label (metric cards, tags) */
  labelText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: LightColors.textTertiary,
    textTransform: 'uppercase' as const,
  },
};
