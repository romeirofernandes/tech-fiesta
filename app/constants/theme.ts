/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#ffffff';

// Extended color token set adapted from the frontend CSS variables.
// Values are React Native friendly (hex / rgba approximations).
export const Colors = {
  light: {
    // core
    text: '#11181C',
    foreground: '#11181C',
    background: '#FFFFFF',
    // surfaces
    card: '#FFFFFF',
    cardForeground: '#11181C',
    popover: '#FFFFFF',
    popoverForeground: '#11181C',
    // brand
    primary: tintColorLight,
    primaryForeground: '#FFFFFF',
    secondary: '#F5F7F9',
    secondaryForeground: '#21303A',
    muted: '#F3F4F6',
    mutedForeground: '#6B7280',
    accent: '#E6F4FF',
    accentForeground: '#0F1724',
    destructive: '#DC2626',
    // borders / inputs / rings
    border: '#E6E9EB',
    input: '#F7F7F7',
    ring: '#0A7EA4',
    // charts (5-color palette)
    chart1: '#1F77B4',
    chart2: '#FF7F0E',
    chart3: '#2CA02C',
    chart4: '#9467BD',
    chart5: '#8C564B',
    // sidebar tokens
    sidebar: '#FAFBFC',
    sidebarForeground: '#11181C',
    sidebarPrimary: tintColorLight,
    sidebarPrimaryForeground: '#FFFFFF',
    sidebarAccent: '#F5F7F9',
    sidebarAccentForeground: '#21303A',
    sidebarBorder: '#E6E9EB',
    sidebarRing: '#0A7EA4',
    // misc
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    // core
    text: '#ECEDEE',
    foreground: '#ECEDEE',
    background: '#151718',
    // surfaces
    card: '#101214',
    cardForeground: '#ECEDEE',
    popover: '#101214',
    popoverForeground: '#ECEDEE',
    // brand
    primary: '#66B8E6',
    primaryForeground: '#0F1112',
    secondary: '#2F3133',
    secondaryForeground: '#ECEDEE',
    muted: '#2F3133',
    mutedForeground: '#9BA1A6',
    accent: '#2F3133',
    accentForeground: '#ECEDEE',
    destructive: '#FF6B6B',
    // borders / inputs / rings
    border: 'rgba(255,255,255,0.12)',
    input: 'rgba(255,255,255,0.16)',
    ring: '#66B8E6',
    // charts
    chart1: '#2AA6D6',
    chart2: '#FF9F4A',
    chart3: '#6ED08B',
    chart4: '#A88CE8',
    chart5: '#D29382',
    // sidebar
    sidebar: '#1B1D1E',
    sidebarForeground: '#ECEDEE',
    sidebarPrimary: '#66B8E6',
    sidebarPrimaryForeground: '#ECEDEE',
    sidebarAccent: '#2F3133',
    sidebarAccentForeground: '#ECEDEE',
    sidebarBorder: 'rgba(255,255,255,0.12)',
    sidebarRing: '#66B8E6',
    // misc
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
