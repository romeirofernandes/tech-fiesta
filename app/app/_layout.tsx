import { View } from 'react-native';
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
import { syncService } from '@/services/SyncService';

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
    // Start background sync monitoring & cleanup on unmount/re-render
    const unsubscribe = syncService.startMonitoring();
    return () => unsubscribe();
  }, [loaded, error]);

  if (!loaded && !error) {
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
