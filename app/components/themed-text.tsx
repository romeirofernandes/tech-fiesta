import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { FontFamily, Typography } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'bodySmall' | 'caption';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'h1' ? styles.h1 : undefined,
        type === 'h2' ? styles.h2 : undefined,
        type === 'h3' ? styles.h3 : undefined,
        type === 'h4' ? styles.h4 : undefined,
        type === 'h5' ? styles.h5 : undefined,
        type === 'h6' ? styles.h6 : undefined,
        type === 'bodySmall' ? styles.bodySmall : undefined,
        type === 'caption' ? styles.caption : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
  },
  defaultSemiBold: {
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontWeight: '600',
  },
  title: {
    fontFamily: Typography.h1.fontFamily,
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    letterSpacing: Typography.h1.letterSpacing,
    lineHeight: Typography.h1.fontSize,
  },
  subtitle: {
    fontFamily: Typography.h4.fontFamily,
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    letterSpacing: Typography.h4.letterSpacing,
  },
  link: {
    fontFamily: Typography.body.fontFamily,
    lineHeight: Typography.body.lineHeight,
    fontSize: Typography.body.fontSize,
    color: '#426d57',  // matches primary green
  },
  h1: {
    fontFamily: Typography.h1.fontFamily,
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    letterSpacing: Typography.h1.letterSpacing,
    lineHeight: Typography.h1.fontSize,
  },
  h2: {
    fontFamily: Typography.h2.fontFamily,
    fontSize: Typography.h2.fontSize,
    fontWeight: Typography.h2.fontWeight,
    letterSpacing: Typography.h2.letterSpacing,
    lineHeight: Typography.h2.fontSize,
  },
  h3: {
    fontFamily: Typography.h3.fontFamily,
    fontSize: Typography.h3.fontSize,
    fontWeight: Typography.h3.fontWeight,
    letterSpacing: Typography.h3.letterSpacing,
    lineHeight: Typography.h3.fontSize,
  },
  h4: {
    fontFamily: Typography.h4.fontFamily,
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    letterSpacing: Typography.h4.letterSpacing,
    lineHeight: Typography.h4.fontSize,
  },
  h5: {
    fontFamily: Typography.h5.fontFamily,
    fontSize: Typography.h5.fontSize,
    fontWeight: Typography.h5.fontWeight,
    letterSpacing: Typography.h5.letterSpacing,
    lineHeight: Typography.h5.fontSize,
  },
  h6: {
    fontFamily: Typography.h6.fontFamily,
    fontSize: Typography.h6.fontSize,
    fontWeight: Typography.h6.fontWeight,
    letterSpacing: Typography.h6.letterSpacing,
    lineHeight: Typography.h6.fontSize,
  },
  bodySmall: {
    fontFamily: Typography.bodySmall.fontFamily,
    fontSize: Typography.bodySmall.fontSize,
    lineHeight: Typography.bodySmall.lineHeight,
  },
  caption: {
    fontFamily: Typography.caption.fontFamily,
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
  },
});

