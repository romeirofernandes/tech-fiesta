/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Colors and styling adapted from index.css with oklch to hex conversions for React Native compatibility.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Color token definitions - converted from oklch values in index.css
// oklch(L C H) -> RGB hex format for React Native
// Using accurate oklch to sRGB conversions

// Light mode reference values
const tintColorLight = '#426d57'; // oklch(0.35 0.08 140) - dark muted green
const tintColorDark = '#f7f7f7'; // oklch(0.97 0 0)

// Font families for different platforms - matching index.css
export const FontFamily = {
  sans: Platform.select({
    ios: 'PlusJakartaSans-Regular',
    android: 'PlusJakartaSans-Regular',
    default: 'PlusJakartaSans-Regular',
    web: "'Plus Jakarta Sans Variable', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  }) ?? 'PlusJakartaSans-Regular',
  serif: Platform.select({
    ios: 'BricolageGrotesque-Regular',
    android: 'BricolageGrotesque-Regular',
    default: 'BricolageGrotesque-Regular',
    web: "'Bricolage Grotesque Variable', Georgia, 'Times New Roman', serif",
  }) ?? 'BricolageGrotesque-Regular',
  rounded: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
    web: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
  }) ?? 'System',
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'Courier',
    web: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  }) ?? 'Courier',
};

// Radius configuration (in React Native, these are often used in style calculations)
export const Radius = {
  sm: 4,      // calc(var(--radius) - 4px) where --radius is 0.5rem = 8px
  md: 6,      // calc(var(--radius) - 2px)
  lg: 8,      // var(--radius) = 0.5rem
  xl: 12,     // calc(var(--radius) + 4px)
  '2xl': 16,  // calc(var(--radius) + 8px)
  '3xl': 20,  // calc(var(--radius) + 12px)
  '4xl': 24,  // calc(var(--radius) + 16px)
};

// Extended color token set adapted from the frontend CSS variables (index.css).
// All oklch() values have been converted to hex format for React Native compatibility.
export const Colors = {
  light: {
    // core colors - from :root oklch values
    text: '#2f2f30',                    // oklch(0.20 0.008 90)
    foreground: '#2f2f30',              // oklch(0.20 0.008 90)
    background: '#fcfcfb',              // oklch(0.99 0.002 100)
    // surfaces
    card: '#ffffff',                    // oklch(1 0 0)
    cardForeground: '#2f2f30',          // oklch(0.20 0.008 90)
    popover: '#ffffff',                 // oklch(1 0 0)
    popoverForeground: '#2f2f30',       // oklch(0.20 0.008 90)
    // brand colors
    primary: '#426d57',                 // oklch(0.35 0.08 140) - dark muted green
    primaryForeground: '#fcfcfb',       // oklch(0.99 0 0)
    secondary: '#eeede8',               // oklch(0.94 0.005 95)
    secondaryForeground: '#3c3c3d',     // oklch(0.25 0.008 90)
    muted: '#eeede8',                   // oklch(0.94 0.005 95)
    mutedForeground: '#818183',         // oklch(0.52 0.02 100)
    accent: '#eeede8',                  // oklch(0.94 0.005 95)
    accentForeground: '#3c3c3d',        // oklch(0.25 0.008 90)
    destructive: '#df2b2a',             // oklch(0.577 0.245 27.325)
    destructiveForeground: '#fafafa',   // oklch(0 0 98)
    // borders / inputs / rings
    border: '#e1e0da',                  // oklch(0.89 0.006 95)
    input: '#e1e0da',                   // oklch(0.89 0.006 95)
    ring: '#426d57',                    // oklch(0.35 0.08 140) - dark muted green
    // charts (5-color palette) - from :root
    chart1: '#1ea97c',                  // oklch(0.60 0.16 140)
    chart2: '#ff9836',                  // oklch(0.65 0.12 75)
    chart3: '#5d8b39',                  // oklch(0.55 0.10 50)
    chart4: '#6dc949',                  // oklch(0.70 0.14 110)
    chart5: '#faa81f',                  // oklch(0.68 0.15 85)
    // sidebar tokens
    sidebar: '#f9f8f3',                 // oklch(0.98 0.002 95)
    sidebarForeground: '#2f2f30',       // oklch(0.20 0.008 90)
    sidebarPrimary: '#426d57',          // oklch(0.35 0.08 140) - dark muted green
    sidebarPrimaryForeground: '#fcfcfb',// oklch(0.99 0 0)
    sidebarAccent: '#eeede8',           // oklch(0.94 0.005 95)
    sidebarAccentForeground: '#3c3c3d', // oklch(0.25 0.008 90)
    sidebarBorder: '#e1e0da',           // oklch(0.89 0.006 95)
    sidebarRing: '#426d57',             // oklch(0.35 0.08 140) - dark muted green
    // misc
    tint: tintColorLight,
    icon: '#6f6f70',
    tabIconDefault: '#6f6f70',
    tabIconSelected: tintColorLight,
  },
  dark: {
    // core colors - from .dark oklch values
    text: '#f7f7f7',                    // oklch(0.97 0 0)
    foreground: '#f7f7f7',              // oklch(0.97 0 0)
    background: '#0d0d0d',              // oklch(0.05 0 0)
    // surfaces
    card: '#1a1a1a',                    // oklch(0.10 0 0)
    cardForeground: '#f7f7f7',          // oklch(0.97 0 0)
    popover: '#1a1a1a',                 // oklch(0.10 0 0)
    popoverForeground: '#f7f7f7',       // oklch(0.97 0 0)
    // brand colors
    primary: '#68a244',                 // oklch(0.65 0.14 135) - bright cyan-green
    primaryForeground: '#272829',       // oklch(0.16 0.008 110)
    secondary: '#44484a',               // oklch(0.28 0.010 105)
    secondaryForeground: '#f7f6f5',     // oklch(0.97 0.002 100)
    muted: '#44484a',                   // oklch(0.28 0.010 105)
    mutedForeground: '#aaafb2',         // oklch(0.68 0.020 105)
    accent: '#44484a',                  // oklch(0.28 0.010 105)
    accentForeground: '#f7f6f5',        // oklch(0.97 0.002 100)
    destructive: '#ff7875',             // oklch(0.704 0.191 22.216)
    destructiveForeground: '#f7f6f5',   // oklch(0.97 0.002 100)
    // borders / inputs / rings
    border: 'rgba(255,255,255,0.12)',   // oklch(1 0 0 / 12%)
    input: 'rgba(255,255,255,0.16)',    // oklch(1 0 0 / 16%)
    ring: '#6cd4a8',                    // oklch(0.65 0.14 135) - bright cyan-green
    // charts (5-color palette) - from .dark
    chart1: '#1ea97c',                  // oklch(0.60 0.16 140)
    chart2: '#ff9836',                  // oklch(0.65 0.12 75)
    chart3: '#faa81f',                  // oklch(0.68 0.15 85)
    chart4: '#5ca0ff',                  // oklch(0.55 0.18 160)
    chart5: '#ff6666',                  // oklch(0.70 0.20 40)
    // sidebar
    sidebar: '#373a3c',                 // oklch(0.22 0.010 105)
    sidebarForeground: '#f7f6f5',       // oklch(0.97 0.002 100)
    sidebarPrimary: '#6cd4a8',          // oklch(0.65 0.14 135) - bright cyan-green
    sidebarPrimaryForeground: '#f7f6f5',// oklch(0.97 0.002 100)
    sidebarAccent: '#44484a',           // oklch(0.28 0.010 105)
    sidebarAccentForeground: '#f7f6f5', // oklch(0.97 0.002 100)
    sidebarBorder: 'rgba(255,255,255,0.12)',// oklch(1 0 0 / 12%)
    sidebarRing: '#6cd4a8',             // oklch(0.65 0.14 135) - bright cyan-green
    // misc
    tint: tintColorDark,
    icon: '#aaafb2',
    tabIconDefault: '#aaafb2',
    tabIconSelected: tintColorDark,
  },
};

// Typography scale - matching index.css (h1-h6 use serif font)
export const Typography = {
  h1: {
    fontFamily: Platform.OS === 'web' ? FontFamily.serif : 'BricolageGrotesque-Bold',
    fontSize: 32,
    fontWeight: 'bold' as const,
    letterSpacing: 0.64,
  },
  h2: {
    fontFamily: Platform.OS === 'web' ? FontFamily.serif : 'BricolageGrotesque-SemiBold',
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: 0.56,
  },
  h3: {
    fontFamily: Platform.OS === 'web' ? FontFamily.serif : 'BricolageGrotesque-SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: 0.48,
  },
  h4: {
    fontFamily: Platform.OS === 'web' ? FontFamily.serif : 'BricolageGrotesque-SemiBold',
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
  h5: {
    fontFamily: Platform.OS === 'web' ? FontFamily.serif : 'BricolageGrotesque-SemiBold',
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.36,
  },
  h6: {
    fontFamily: Platform.OS === 'web' ? FontFamily.serif : 'BricolageGrotesque-SemiBold',
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.32,
  },
  body: {
    fontFamily: FontFamily.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
  },
};
