import { View } from 'react-native';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '@/context/UserContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { colorScheme: nativeColorScheme } = useColorScheme();
  const colorScheme = nativeColorScheme ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];

  const [loaded, error] = useFonts({
    'InstrumentSerif-Regular': InstrumentSerif_400Regular,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Create custom theme using the app's color palette
  const customTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.destructive,
    },
    fonts: {
      regular: {
        fontFamily: FontFamily.sans,
        fontWeight: '400' as const,
      },
      medium: {
        fontFamily: FontFamily.sans,
        fontWeight: '600' as const,
      },
      bold: {
        fontFamily: FontFamily.sans,
        fontWeight: 'bold' as const,
      },
      heavy: {
        fontFamily: FontFamily.sans,
        fontWeight: '900' as const,
      },
    },
  };

  if (!loaded && !error) {
    return null;
  }

  return (
    <UserProvider>
      <ThemeProvider value={customTheme}>
        <View style={{ flex: 1 }} className={colorScheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      </ThemeProvider>
    </UserProvider>
  );
}
