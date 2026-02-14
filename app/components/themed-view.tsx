import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'default' | 'card' | 'popover';
};

export function ThemedView({ style, lightColor, darkColor, variant = 'default', ...otherProps }: ThemedViewProps) {
  let colorName: 'background' | 'card' | 'popover' = 'background';
  
  if (variant === 'card') {
    colorName = 'card';
  } else if (variant === 'popover') {
    colorName = 'popover';
  }
  
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, colorName);

  const variantStyles = {
    default: {},
    card: {
      borderRadius: Radius.lg,
      padding: 16,
    },
    popover: {
      borderRadius: Radius.lg,
      padding: 12,
    },
  };

  return (
    <View
      style={[
        { backgroundColor },
        variantStyles[variant],
        style,
      ]}
      {...otherProps}
    />
  );
}
