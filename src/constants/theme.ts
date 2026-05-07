/**
 * Nutrify design system tokens.
 * NativeWind handles the actual styling via Tailwind classes,
 * but these constants are the source of truth for non-Tailwind contexts
 * (e.g. status bar color, navigation theme).
 */

export const brandColors = {
  primary: '#10b981', // emerald-500
  primaryDark: '#047857', // emerald-700
  primaryLight: '#ecfdf5', // emerald-50

  accent: '#f59e0b', // amber-500

  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',

  // Macro colors (used in charts)
  protein: '#3b82f6', // blue-500
  carbs: '#f59e0b', // amber-500
  fat: '#a855f7', // purple-500
  fiber: '#10b981', // emerald-500
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
