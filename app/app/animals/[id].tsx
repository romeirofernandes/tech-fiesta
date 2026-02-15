import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MapPin,
  Thermometer,
  Droplets,
  Heart,
  Activity,
  Syringe,
  Calendar,
  Shield,
  CloudOff,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { db } from '@/lib/db';
import { syncService } from '@/services/SyncService';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { useIotPolling } from '@/hooks/useIotPolling';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Species emoji mapping
const getSpeciesEmoji = (species: string) => {
  const map: Record<string, string> = {
    cow: '🐄', buffalo: '🐃', goat: '🐐', sheep: '🐑',
    chicken: '🐔', pig: '🐷', horse: '🐴',
  };
  return map[species] || '🐾';
};

export default function AnimalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [animal, setAnimal] = useState<any>(null);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [healthSnapshot, setHealthSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Vitals
  const { 
    latestReading, 
    status: iotStatus 
  } = useIotPolling({
    rfid: animal?.rfid || null,
    enabled: !!animal?.rfid,
    pollInterval: 3000,
  });

  const loadAnimalFromDB = useCallback(async () => {
    try {
      const row = db.getFirstSync('SELECT * FROM animals WHERE id = ?', [id]);
      if (row) setAnimal(row);

      // Load vaccinations from local DB
      const vRows = db.getAllSync(
        'SELECT * FROM vaccinations WHERE animalId = ? ORDER BY date ASC',
        [id]
      );
      setVaccinations(vRows as any[]);

      // Load latest health snapshot
      const hRow = db.getFirstSync(
        'SELECT * FROM health_snapshots WHERE animalId = ? ORDER BY date DESC LIMIT 1',
        [id]
      );
      if (hRow) setHealthSnapshot(hRow);
    } catch (error) {
      console.error('Error loading animal from DB:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const fetchFromApi = useCallback(async () => {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || !netState.isInternetReachable) return;

      const response = await axios.get(`${API_BASE_URL}/api/animals/${id}`);
      if (response.data) {
        const apiAnimal = response.data.animal || response.data;
        const apiVaccinations = response.data.vaccinationEvents || [];

        // Update local animal
        setAnimal((prev: any) => ({
          ...prev,
          ...apiAnimal,
          id: apiAnimal._id || apiAnimal.id || id,
          farmId: apiAnimal.farmId?._id || apiAnimal.farmId,
          farmName: apiAnimal.farmId?.name || prev?.farmName,
          farmLocation: apiAnimal.farmId?.location || prev?.farmLocation,
        }));

        // Update local vaccinations
        setVaccinations(apiVaccinations);

        // Persist vaccinations to local DB
        for (const v of apiVaccinations) {
          db.runSync(
            'INSERT OR REPLACE INTO vaccinations (id, animalId, vaccineName, date, status, eventType) VALUES (?, ?, ?, ?, ?, ?)',
            [
              v._id ?? null,
              id,
              v.vaccineName ?? null,
              v.date ?? null,
              v.status ?? null,
              v.eventType ?? null,
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error fetching animal from API:', error);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadAnimalFromDB().then(() => fetchFromApi());
    }, [loadAnimalFromDB, fetchFromApi])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnimalFromDB().then(() => fetchFromApi());
  }, [loadAnimalFromDB, fetchFromApi]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Animal',
      `Are you sure you want to delete "${animal?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              db.runSync('DELETE FROM animals WHERE id = ?', [id]);
              db.runSync('DELETE FROM vaccinations WHERE animalId = ?', [id]);
              await syncService.addToQueue('DELETE', 'animals', { _id: id });
              router.back();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete animal');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={themeColors.primary} />
      </SafeAreaView>
    );
  }

  if (!animal) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-5xl mb-4">🐾</Text>
        <Text className="text-xl font-bold text-foreground mb-2">Animal not found</Text>
        <TouchableOpacity
          className="bg-primary px-5 py-3 rounded-xl flex-row items-center mt-4"
          onPress={() => router.back()}
        >
          <ArrowLeft size={16} color="#fff" />
          <Text className="text-primary-foreground font-semibold ml-2">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Vaccination stats
  const upcomingVacc = vaccinations.filter(
    (v) => v.eventType === 'scheduled' && new Date(v.date) >= new Date()
  );
  
  // Vitals Status Color
  const isConnected = iotStatus === 'connected';
  const statusColor = isConnected ? '#22c55e' : (iotStatus === 'polling' ? '#eab308' : '#ef4444');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
        }
      >
        {/* Header Bar */}
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center bg-muted px-3 py-2 rounded-xl"
            onPress={() => router.back()}
          >
            <ArrowLeft size={18} color={themeColors.foreground} />
            <Text className="text-sm font-semibold text-foreground ml-1.5">Back</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              className="bg-muted px-3 py-2 rounded-xl"
              // @ts-ignore
              onPress={() => router.push(`/animals/${id}/edit`)}
            >
              <Edit2 size={18} color={themeColors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-destructive/10 px-3 py-2 rounded-xl"
              onPress={handleDelete}
            >
              <Trash2 size={18} color={themeColors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Animal Hero Card */}
        <View className="px-5 py-3">
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-5">
              <View className="flex-row items-start gap-4">
                {/* Large Avatar */}
                <View className="w-24 h-24 rounded-2xl overflow-hidden bg-muted items-center justify-center border-2 border-primary/15 relative">
                  {animal.imageUrl ? (
                    <Image
                      source={{ uri: animal.imageUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-5xl">{getSpeciesEmoji(animal.species)}</Text>
                  )}
                  {animal.syncStatus === 'pending' && (
                     <View className="absolute bottom-0 right-0 bg-yellow-500 rounded-tl-lg p-1">
                        <CloudOff size={10} color="#fff" />
                     </View>
                  )}
                </View>

                {/* Info */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-2xl font-bold text-foreground">{animal.name}</Text>
                  </View>
                  {animal.rfid && (
                    <Text className="text-sm text-muted-foreground mb-3">RFID: {animal.rfid}</Text>
                  )}

                  {/* Badges */}
                  <View className="flex-row flex-wrap gap-1.5">
                    <View className="bg-primary/10 px-3 py-1.5 rounded-full">
                      <Text className="text-xs font-bold text-primary capitalize">
                        {animal.species || 'Unknown'}
                      </Text>
                    </View>
                    {animal.gender && (
                      <View className="bg-muted px-3 py-1.5 rounded-full">
                        <Text className="text-xs font-semibold text-muted-foreground capitalize">
                          {animal.gender}
                        </Text>
                      </View>
                    )}
                    {animal.breed && (
                      <View className="bg-muted px-3 py-1.5 rounded-full">
                        <Text className="text-xs font-semibold text-muted-foreground">
                          {animal.breed}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Details Grid */}
              <View className="flex-row flex-wrap gap-3 mt-5">
                <View className="bg-muted/50 rounded-xl px-4 py-3 flex-1 min-w-[45%]">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Clock size={14} color={themeColors.primary} />
                    <Text className="text-[11px] text-muted-foreground font-medium">Age</Text>
                  </View>
                  <Text className="text-base font-bold text-foreground">
                    {animal.age ?? '–'} {animal.ageUnit || 'months'}
                  </Text>
                </View>

                {animal.farmName && (
                  <View className="bg-muted/50 rounded-xl px-4 py-3 flex-1 min-w-[45%]">
                    <View className="flex-row items-center gap-2 mb-1">
                      <MapPin size={14} color={themeColors.primary} />
                      <Text className="text-[11px] text-muted-foreground font-medium">Farm</Text>
                    </View>
                    <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                      {animal.farmName}
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Live Vitals Section */}
        {animal.rfid && (
          <View className="px-5 py-2">
             <View className="flex-row items-center justify-between mb-3 px-1">
                <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Live Vitals
                </Text>
                <View className="flex-row items-center gap-1.5 bg-card border border-border px-2 py-1 rounded-full">
                  {isConnected ? <Wifi size={12} color="#22c55e" /> : <WifiOff size={12} color={themeColors.mutedForeground} />}
                  <Text style={{ color: statusColor, fontSize: 10, fontWeight: '700' }}>
                    {isConnected ? 'LIVE' : iotStatus?.toUpperCase()}
                  </Text>
                </View>
             </View>
             
             <View className="flex-row gap-3">
                {/* Heart Rate */}
                <Card className="flex-1 bg-card border-border">
                  <CardContent className="p-4 items-center">
                    <View className="bg-rose-500/10 w-10 h-10 rounded-full items-center justify-center mb-2">
                       <Activity size={20} color="#f43f5e" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">
                      {latestReading?.heartRate ? `${Math.round(latestReading.heartRate)}` : '--'}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground font-medium">BPM</Text>
                  </CardContent>
                </Card>

                {/* Body Temp */}
                <Card className="flex-1 bg-card border-border">
                  <CardContent className="p-4 items-center">
                    <View className="bg-orange-500/10 w-10 h-10 rounded-full items-center justify-center mb-2">
                       <Thermometer size={20} color="#f97316" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">
                      {latestReading?.temperature ? `${latestReading.temperature.toFixed(1)}°` : '--'}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground font-medium">Temp (C)</Text>
                  </CardContent>
                </Card>

                {/* Humidity */}
                <Card className="flex-1 bg-card border-border">
                  <CardContent className="p-4 items-center">
                    <View className="bg-blue-500/10 w-10 h-10 rounded-full items-center justify-center mb-2">
                       <Droplets size={20} color="#3b82f6" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">
                       {latestReading?.humidity != null ? `${Math.round(latestReading.humidity)}%` : '--'}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground font-medium">Humidity</Text>
                  </CardContent>
                </Card>
             </View>
          </View>
        )}

        {/* Health Overview (Stats) */}
        {!animal.rfid && (
          <View className="px-5 py-4 items-center justify-center opacity-50">
             <Text className="text-sm text-muted-foreground">Attach RFID tag to see live vitals</Text>
          </View>
        )}

        <View className="px-5 py-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 ml-1">
            Records
          </Text>
          <View className="flex-row gap-3">
            <Card className="flex-1 bg-card border-border">
              <CardContent className="p-4 items-center">
                <View className="bg-green-500/10 w-10 h-10 rounded-full items-center justify-center mb-2">
                  <Heart size={20} color="#22c55e" />
                </View>
                <Text className="text-lg font-bold text-foreground">
                  {healthSnapshot?.score ?? '—'}
                </Text>
                <Text className="text-[10px] text-muted-foreground font-medium">Health Score</Text>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-card border-border">
              <CardContent className="p-4 items-center">
                <View className="bg-blue-500/10 w-10 h-10 rounded-full items-center justify-center mb-2">
                  <Syringe size={20} color="#3b82f6" />
                </View>
                <Text className="text-lg font-bold text-foreground">{vaccinations.length}</Text>
                <Text className="text-[10px] text-muted-foreground font-medium">Vaccinations</Text>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-card border-border">
              <CardContent className="p-4 items-center">
                <View className="bg-amber-500/10 w-10 h-10 rounded-full items-center justify-center mb-2">
                  <Shield size={20} color="#f59e0b" />
                </View>
                <Text className="text-lg font-bold text-foreground">{upcomingVacc.length}</Text>
                <Text className="text-[10px] text-muted-foreground font-medium">Upcoming</Text>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Vaccination Schedule */}
        <View className="px-5 py-4">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 ml-1">
            Vaccination Schedule
          </Text>
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              {vaccinations.length === 0 ? (
                <View className="p-8 items-center justify-center">
                  <Syringe size={24} color={themeColors.mutedForeground} style={{ opacity: 0.5 }} />
                  <Text className="text-sm text-muted-foreground mt-2">
                    No vaccination records yet
                  </Text>
                </View>
              ) : (
                <View>
                  {vaccinations.map((vacc, index) => {
                    const vaccDate = new Date(vacc.date);
                    const isPast = vaccDate < new Date();
                    const isAdministered = vacc.eventType === 'administered';
                    const isOverdue = !isAdministered && isPast;

                    return (
                      <View
                        key={vacc.id || index}
                        className={`px-4 py-3.5 flex-row items-center gap-3 ${
                          index < vaccinations.length - 1 ? 'border-b border-border' : ''
                        }`}
                      >
                        <View
                          className={`w-2.5 h-2.5 rounded-full ${
                            isAdministered
                              ? 'bg-green-500'
                              : isOverdue
                              ? 'bg-destructive'
                              : 'bg-amber-500'
                          }`}
                        />
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                            {vacc.vaccineName || 'Unknown Vaccine'}
                          </Text>
                          <View className="flex-row items-center gap-2 mt-0.5">
                            <Calendar size={10} color={themeColors.mutedForeground} />
                            <Text className="text-xs text-muted-foreground">
                              {vaccDate.toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <View
                          className={`px-2.5 py-1 rounded-full ${
                            isAdministered
                              ? 'bg-green-500/10'
                              : isOverdue
                              ? 'bg-destructive/10'
                              : 'bg-amber-500/10'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isAdministered
                                ? 'text-green-600'
                                : isOverdue
                                ? 'text-destructive'
                                : 'text-amber-600'
                            }`}
                          >
                            {isAdministered ? 'Done' : isOverdue ? 'Overdue' : 'Upcoming'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
