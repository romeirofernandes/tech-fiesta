import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '@/context/UserContext';
import { syncService } from '@/services/SyncService';
import { getDbAsync } from '@/lib/db';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { colorScheme: nativeColorScheme } = useColorScheme();
  const colorScheme = nativeColorScheme ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const [dbReady, setDbReady] = useState(false);

  const [loaded, error] = useFonts({
    'InstrumentSerif-Regular': InstrumentSerif_400Regular,
  });

  // Initialize database tables on mount (before sync monitoring)
  useEffect(() => {
    getDbAsync().then(() => {
      console.log('[App] Database ready');
      setDbReady(true);
    }).catch((e) => {
      console.error('[App] Database init error:', e);
      // Still allow app to render even if DB init fails
      setDbReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Start sync monitoring only after DB is ready
  useEffect(() => {
    if (!dbReady) return;
    const unsubscribe = syncService.startMonitoring();
    return () => unsubscribe();
  }, [dbReady]);

  if (!loaded && !error) {
    return null;
  }

  // Don't render children until DB is initialized
  if (!dbReady) {
    return null;
  }

  return (
    <UserProvider>
      <View style={{ flex: 1 }} className={colorScheme}>
        <Stack
          screenOptions={{ 
            headerShown: false,
            contentStyle: { backgroundColor: colors.background }
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </UserProvider>
  );
}

