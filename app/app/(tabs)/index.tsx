
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { 
  Beef, 
  Tractor, 
  AlertTriangle, 
  Syringe, 
  Activity, 
  Heart, 
  Bell, 
  MapPin, 
  ArrowRight,
  Plus,
  QrCode,
  FileText
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { fetchAndSyncDashboardData, getLocalDashboardData, type DashboardData } from '@/lib/sync-dashboard';
import { initDatabase } from '@/lib/db';
import { useUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45; // 45% of screen width

// Helper to parse coordinates
const parseCoordinates = (farm: any) => {
  try {
    // Try parsing from JSON stored coordinates
    if (farm.coordinates) {
      const parsed = JSON.parse(farm.coordinates);
      if (parsed.lat && parsed.lng) return { latitude: Number(parsed.lat), longitude: Number(parsed.lng) };
    }
    // Fallback to location string "lat,lng"
    if (farm.location) {
      const parts = farm.location.split(',').map((c: string) => parseFloat(c.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { latitude: parts[0], longitude: parts[1] };
      }
    }
  } catch (e) {
    console.log('Error parsing coordinates for farm:', farm.id);
  }
  return null;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[colorScheme ?? 'light'];

  const { mongoUser, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>({
    animals: [],
    farms: [],
    alerts: [],
    vaccinations: [],
    healthSnapshots: [],
    sensorEvents: [],
  });

  const loadData = async () => {
    try {
      await initDatabase();
      const localData = getLocalDashboardData();
      setData(localData);
      
      if (mongoUser?._id) {
        await fetchAndSyncDashboardData(mongoUser._id);
      } else {
        await fetchAndSyncDashboardData();
      }
      const updatedData = getLocalDashboardData();
      setData(updatedData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userLoading) {
      loadData();
    }
  }, [userLoading, mongoUser?._id]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [mongoUser]);

  // Stats Logic
  const activeAlerts = data.alerts.filter((a) => !a.isResolved);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "high");
  const vaccinationsDue = data.vaccinations.filter((v) => {
    if (v.eventType !== "scheduled") return false;
    const eventDate = new Date(v.date);
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return eventDate >= now && eventDate <= weekFromNow;
  });
  const avgHealthScore = data.healthSnapshots.length > 0
    ? Math.round(data.healthSnapshots.reduce((sum, h) => sum + (h.score || 0), 0) / data.healthSnapshots.length)
    : 0;
  
  const speciesCount = data.animals.reduce((acc: any, a) => {
    acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {});

  const recentAlerts = activeAlerts.slice(0, 5);

  // Map Markers
  const farmMarkers = data.farms.map(f => {
    const coords = parseCoordinates(f);
    return coords ? { ...f, coords } : null;
  }).filter(Boolean);

  const initialRegion = farmMarkers.length > 0 
    ? {
        latitude: farmMarkers.reduce((sum, f) => sum + f.coords.latitude, 0) / farmMarkers.length,
        longitude: farmMarkers.reduce((sum, f) => sum + f.coords.longitude, 0) / farmMarkers.length,
        latitudeDelta: 5,
        longitudeDelta: 5,
      }
    : {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 20,
        longitudeDelta: 20,
      };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
        }
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-3xl font-bold text-foreground font-serif">Dashboard</Text>
          <Text className="text-muted-foreground mt-1">Overview of your operations</Text>
        </View>

        {/* Quick Actions */}
        <View className="px-5 py-4">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4 overflow-visible">
            {[
              { label: 'Add Animal', icon: Plus, route: '/animals/create', color: themeColors.primary, bg: 'bg-primary/10' },
              { label: 'Add Farm', icon: Tractor, route: '/farms/create', color: '#0ea5e9', bg: 'bg-sky-500/10' },
            ].map((action, i) => (
              <TouchableOpacity 
                key={i} 
                className="items-center mr-4"
                // @ts-ignore
                onPress={() => router.push(action.route)}
              >
                <View className={`${action.bg} w-14 h-14 rounded-full items-center justify-center mb-2 shadow-sm`}>
                  <action.icon size={24} color={action.color} />
                </View>
                <Text className="text-xs font-medium text-foreground">{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Metrics - Horizontal Scroll */}
        <View className="py-2">
           <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-5">Key Metrics</Text>
           <ScrollView 
             horizontal 
             showsHorizontalScrollIndicator={false} 
             contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 20 }}
             snapToInterval={CARD_WIDTH + 16}
             decelerationRate="fast"
           >
             {/* Card 1: Animals */}
             <TouchableOpacity 
               activeOpacity={0.9} 
               style={{ width: CARD_WIDTH }}
               className="mr-4"
               // @ts-ignore
               onPress={() => router.push('/animals')}
             >
               <Card className="h-40 bg-card border-border shadow-sm">
                 <CardContent className="p-4 justify-between h-full">
                   <View className="bg-primary/10 w-10 h-10 rounded-full items-center justify-center">
                     <Beef size={20} color={themeColors.primary} />
                   </View>
                   <View>
                     <Text className="text-xs text-muted-foreground font-medium mb-1">Total Animals</Text>
                     <Text className="text-2xl font-bold text-foreground">{data.animals.length}</Text>
                     <Text className="text-[10px] text-muted-foreground mt-1">{Object.keys(speciesCount).length} Species</Text>
                   </View>
                 </CardContent>
               </Card>
             </TouchableOpacity>

             {/* Card 2: Farms */}
             <TouchableOpacity 
               activeOpacity={0.9} 
               style={{ width: CARD_WIDTH }}
               className="mr-4"
               // @ts-ignore
               onPress={() => router.push('/farms')}
             >
               <Card className="h-40 bg-card border-border shadow-sm">
                 <CardContent className="p-4 justify-between h-full">
                   <View className="bg-sky-500/10 w-10 h-10 rounded-full items-center justify-center">
                     <Tractor size={20} color="#0ea5e9" />
                   </View>
                   <View>
                     <Text className="text-xs text-muted-foreground font-medium mb-1">Total Farms</Text>
                     <Text className="text-2xl font-bold text-foreground">{data.farms.length}</Text>
                     <Text className="text-[10px] text-muted-foreground mt-1">Active Locations</Text>
                   </View>
                 </CardContent>
               </Card>
             </TouchableOpacity>

             {/* Card 3: Alerts */}
             <TouchableOpacity 
               activeOpacity={0.9} 
               style={{ width: CARD_WIDTH }}
               className="mr-4"
               // @ts-ignore
               onPress={() => router.push('/alerts')}
             >
               <Card className="h-40 bg-card border-border shadow-sm">
                 <CardContent className="p-4 justify-between h-full">
                   <View className="bg-destructive/10 w-10 h-10 rounded-full items-center justify-center">
                     <AlertTriangle size={20} color={themeColors.destructive} />
                   </View>
                   <View>
                     <Text className="text-xs text-muted-foreground font-medium mb-1">Active Alerts</Text>
                     <Text className="text-2xl font-bold text-foreground">{activeAlerts.length}</Text>
                     <Text className="text-[10px] text-destructive font-semibold mt-1">
                       {criticalAlerts.length > 0 ? `${criticalAlerts.length} Critical` : 'No Critical'}
                     </Text>
                   </View>
                 </CardContent>
               </Card>
             </TouchableOpacity>

             {/* Card 4: Health */}
             <TouchableOpacity 
               activeOpacity={0.9} 
               style={{ width: CARD_WIDTH }}
               // @ts-ignore
               onPress={() => router.push('/health')}
             >
               <Card className="h-40 bg-card border-border shadow-sm">
                 <CardContent className="p-4 justify-between h-full">
                   <View className="bg-green-500/10 w-10 h-10 rounded-full items-center justify-center">
                     <Heart size={20} color="#22c55e" />
                   </View>
                   <View>
                     <Text className="text-xs text-muted-foreground font-medium mb-1">Avg Health</Text>
                     <Text className="text-2xl font-bold text-foreground">{avgHealthScore}%</Text>
                     <Text className="text-[10px] text-muted-foreground mt-1">Based on {data.healthSnapshots.length} logs</Text>
                   </View>
                 </CardContent>
               </Card>
             </TouchableOpacity>
           </ScrollView>
        </View>

        {/* Map Section */}
        <View className="px-5 py-4">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Farm Locations</Text>
          <Card className="overflow-hidden border-border bg-card">
            <View className="h-56 w-full relative">
              <MapView
                provider={PROVIDER_DEFAULT}
                style={StyleSheet.absoluteFill}
                initialRegion={initialRegion}
                customMapStyle={isDark ? mapDarkStyle : []}
              >
                 {farmMarkers.map((marker, index) => (
                   <Marker
                     key={index}
                     coordinate={marker.coords}
                     title={marker.name}
                     description={`${marker.location || 'Farm Location'}`}
                     pinColor={themeColors.primary}
                   />
                 ))}
              </MapView>
              {/* Overlay for interaction hint if needed, or just cleaner look */}
              <View className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded border border-border">
                <Text className="text-[10px] font-bold text-foreground">{farmMarkers.length} Farms</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Recent Alerts List */}
        <View className="px-5 pb-6">
          <View className="flex-row items-center justify-between mb-3">
             <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Recent Alerts</Text>
             <TouchableOpacity 
               // @ts-ignore
               onPress={() => router.push('/alerts')}
             >
               <Text className="text-xs text-primary font-medium">View All</Text>
             </TouchableOpacity>
          </View>
          
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              {recentAlerts.length === 0 ? (
                <View className="p-8 items-center justify-center">
                  <Bell size={24} color={themeColors.mutedForeground} style={{ opacity: 0.5 }} />
                  <Text className="text-sm text-muted-foreground mt-2">No recent alerts</Text>
                </View>
              ) : (
                <View>
                  {recentAlerts.map((alert, index) => (
                    <TouchableOpacity
                      key={alert.id || index}
                      className="px-4 py-3 border-b border-border last:border-b-0 active:bg-muted/50"
                      // @ts-ignore
                      onPress={() => router.push('/alerts')}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className={`w-1.5 h-1.5 rounded-full ${alert.severity === 'high' ? 'bg-destructive' : 'bg-orange-500'}`} />
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{alert.type}</Text>
                            <Text className="text-[10px] text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                            {alert.animalName ? `${alert.animalName} • ` : ''}{alert.message}
                          </Text>
                        </View>
                        <ArrowRight size={14} color={themeColors.mutedForeground} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const mapDarkStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#242f3e"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#242f3e"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#263c3f"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6b9a76"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#38414e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#212a37"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9ca5b3"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#1f2835"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#f3d19c"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#515c6d"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  }
];

