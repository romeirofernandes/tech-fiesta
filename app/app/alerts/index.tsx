import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, BellOff, CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { getLocalDashboardData, fetchAndSyncDashboardData, type DashboardData } from '@/lib/sync-dashboard';
import { initDatabase } from '@/lib/db';
import { useUser } from '@/context/UserContext';

type Alert = DashboardData['alerts'][0];

export default function NotificationsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  const { mongoUser, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const loadData = async () => {
    try {
      await initDatabase();
      const localData = getLocalDashboardData();
      setAlerts(normalizeAlerts(localData.alerts));
      
      // Background sync
      const userId = mongoUser?._id;
      if (userId) {
        fetchAndSyncDashboardData(userId).then(() => {
          const updatedData = getLocalDashboardData();
          setAlerts(normalizeAlerts(updatedData.alerts));
        });
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const normalizeAlerts = (rawAlerts: any[]) => {
    // Sort by date descending
    return rawAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  useEffect(() => {
    if (!userLoading) {
      loadData();
    }
  }, [userLoading, mongoUser?._id]);

  const onRefresh = () => {
    setRefreshing(true);
    const userId = mongoUser?._id;
    fetchAndSyncDashboardData(userId).then(() => {
      const updatedData = getLocalDashboardData();
      setAlerts(normalizeAlerts(updatedData.alerts));
      setRefreshing(false);
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return themeColors.destructive;
      case 'medium': return '#f97316'; // orange-500
      case 'low': return '#eab308'; // yellow-500
      default: return themeColors.primary;
    }
  };

  const getSeverityBadgeVariant = (severity: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary'; // using secondary for orange-ish look usually
      default: return 'outline';
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-border bg-background z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mr-3 p-1"
        >
          <ArrowLeft size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">Notifications</Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
        }
      >
        {loading && alerts.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-muted-foreground">Loading alerts...</Text>
          </View>
        ) : alerts.length === 0 ? (
          <View className="items-center justify-center py-20 opacity-70">
            <View className="bg-muted p-6 rounded-full mb-4">
              <BellOff size={48} color={themeColors.mutedForeground} />
            </View>
            <Text className="text-lg font-medium text-foreground">No notifications</Text>
            <Text className="text-sm text-muted-foreground mt-1 text-center px-10">
              You're all caught up! Check back later for updates on your farm.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={`border-border ${alert.isResolved ? 'opacity-60 bg-muted/20' : 'bg-card'}`}>
                <CardContent className="p-4 flex-row gap-3">
                    {/* Icon Column */}
                    <View className="mt-1">
                        {alert.type === 'Health' ? (
                            <View className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center">
                                <AlertTriangle size={20} color={themeColors.destructive} />
                            </View>
                        ) : alert.isResolved ? (
                            <View className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
                                <CheckCircle2 size={20} color="#22c55e" />
                            </View>
                        ) : (
                             <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center">
                                <Info size={20} color={themeColors.primary} />
                            </View>
                        )}
                    </View>

                    {/* Content Column */}
                <View className="flex-1 gap-1.5">
                        <View className="flex-row justify-between items-start">
                             <View className="flex-shrink-1">
                                <Text className="font-bold text-lg text-black dark:text-white capitalize">
                                    {alert.type || 'System Alert'}
                                </Text>
                             </View>
                             <Text className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2 pt-1 font-medium">
                                {new Date(alert.createdAt).toLocaleDateString()}
                             </Text>
                        </View>
                        
                        <View>
                            {alert.animalName && (
                                <Text className="text-sm font-semibold text-black dark:text-white mb-0.5">
                                    Animal: {alert.animalName}
                                </Text>
                            )}
                            <Text className="text-sm text-black dark:text-white leading-5">
                                {alert.message}
                            </Text>
                        </View>

                        {/* Badges */}
                        <View className="flex-row gap-2 mt-2">
                             <Badge variant={getSeverityBadgeVariant(alert.severity)} className="self-start">
                                <Text className="text-[10px] capitalize">{alert.severity} Priority</Text>
                             </Badge>
                             {alert.isResolved && (
                                 <Badge variant="outline" className="border-green-500 self-start">
                                    <Text className="text-[10px] text-green-500">Resolved</Text>
                                 </Badge>
                             )}
                        </View>
                    </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
