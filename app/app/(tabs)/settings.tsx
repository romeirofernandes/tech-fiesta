import React from 'react';
import { View, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Appearance } from 'react-native';
import { ChevronRight, LogOut, Moon, Sun, User, Settings as SettingsIcon, Bell } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, mongoUser, firebaseUser } = useUser();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[colorScheme ?? 'light'];

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const [themeModalVisible, setThemeModalVisible] = React.useState(false);
  
  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    setColorScheme(mode);
    setThemeModalVisible(false);
  };

  const userInitials = mongoUser?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';

  const SettingItem = ({ icon: Icon, label, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity 
      onPress={onPress} 
      className="flex-row items-center justify-between py-3 border-b border-border last:border-b-0"
    >
      <View className="flex-row items-center gap-3">
        <View className={`p-2 rounded-full ${isDestructive ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          <Icon size={20} color={isDestructive ? themeColors.destructive : themeColors.primary} />
        </View>
        <Text className={`text-base font-medium ${isDestructive ? 'text-destructive' : 'text-foreground'}`}>
          {label}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {value && <Text className="text-muted-foreground">{value}</Text>}
        <ChevronRight size={16} color={themeColors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-3xl font-bold mb-6 text-foreground font-serif">Settings</Text>

        {/* User Profile Section */}
        <Card className="mb-6 bg-card border-border">
          <CardContent className="p-4 flex-row items-center gap-4">
            <Avatar className="h-16 w-16" alt="User Avatar">
              <AvatarImage source={{ uri: mongoUser?.imageUrl || firebaseUser?.photoURL || undefined }} />
              <AvatarFallback className="bg-primary/20">
                <Text className="text-xl font-bold text-primary">{userInitials}</Text>
              </AvatarFallback>
            </Avatar>
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground mb-1">
                {mongoUser?.fullName || 'User Name'}
              </Text>
              <Text className="text-muted-foreground text-sm" numberOfLines={1}>
                {mongoUser?.email || firebaseUser?.email || 'email@example.com'}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider ml-1">Account</Text>
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0 px-4">
              <SettingItem 
                icon={User} 
                label="Edit Profile" 
                onPress={() => router.push('/profile')} 
              />
              <SettingItem 
                icon={SettingsIcon} 
                label="Account Settings" 
                onPress={() => {}} 
              />
              <SettingItem 
                icon={Bell} 
                label="Notifications" 
                onPress={() => {}} 
              />
            </CardContent>
          </Card>
        </View>

        {/* Appearance Settings */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider ml-1">Preferences</Text>
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0 px-4">
               <View className="py-3">
                 <View className="flex-row items-center gap-3 mb-3">
                    <View className="p-2 rounded-full bg-primary/10">
                      {isDark ? (
                        <Moon size={20} color={themeColors.primary} />
                      ) : (
                        <Sun size={20} color={themeColors.primary} />
                      )}
                    </View>
                    <Text className="text-base font-medium text-foreground">Theme</Text>
                 </View>
                 
                 <View className="flex-row gap-2">
                   <TouchableOpacity 
                     onPress={() => setTheme('light')}
                     className={`flex-1 py-2 px-3 rounded-md border ${!isDark ? 'bg-primary border-primary' : 'bg-card border-border'}`}
                   >
                     <Text className={`text-center font-medium ${!isDark ? 'text-primary-foreground' : 'text-foreground'}`}>Light</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={() => setTheme('dark')}
                     className={`flex-1 py-2 px-3 rounded-md border ${isDark ? 'bg-primary border-primary' : 'bg-card border-border'}`}
                   >
                     <Text className={`text-center font-medium ${isDark ? 'text-primary-foreground' : 'text-foreground'}`}>Dark</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={() => setTheme('system')}
                     className="flex-1 py-2 px-3 rounded-md border border-border bg-secondary"
                   >
                     <Text className="text-center font-medium text-secondary-foreground">System</Text>
                   </TouchableOpacity>
                 </View>
               </View>
            </CardContent>
          </Card>
        </View>
        
        {/* Logout Section */}
        <View className="mb-10">
          <Card className="bg-card border-border overflow-hidden">
             <CardContent className="p-0 px-4">
              <TouchableOpacity 
                onPress={handleLogout} 
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center gap-3">
                  <View className="p-2 rounded-full bg-destructive/10">
                    <LogOut size={20} color={themeColors.destructive} />
                  </View>
                  <Text className="text-base font-medium text-destructive">Log Out</Text>
                </View>
              </TouchableOpacity>
            </CardContent>
          </Card>
          <Text className="text-center text-muted-foreground text-xs mt-4">
            App Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
