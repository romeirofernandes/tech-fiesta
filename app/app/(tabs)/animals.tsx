import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Edit2,
  Beef,
  Bird,
  Rabbit,
  Bug,
  CircleAlert,
  Cloud,
  CloudOff,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { db } from '@/lib/db';
import { syncService } from '@/services/SyncService';
import { initDatabase } from '@/lib/db';

// Species configuration
const SPECIES_LIST = [
  { value: 'all', label: 'All', emoji: '🐾' },
  { value: 'cow', label: 'Cow', emoji: '🐄' },
  { value: 'buffalo', label: 'Buffalo', emoji: '🐃' },
  { value: 'goat', label: 'Goat', emoji: '🐐' },
  { value: 'sheep', label: 'Sheep', emoji: '🐑' },
  { value: 'chicken', label: 'Chicken', emoji: '🐔' },
  { value: 'pig', label: 'Pig', emoji: '🐷' },
  { value: 'horse', label: 'Horse', emoji: '🐴' },
  { value: 'other', label: 'Other', emoji: '🐾' },
];

const getSpeciesEmoji = (species: string) => {
  const found = SPECIES_LIST.find((s) => s.value === species);
  return found ? found.emoji : '🐾';
};

export default function AnimalsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[colorScheme ?? 'light'];

  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('all');

  const loadAnimals = useCallback(async () => {
    try {
      await initDatabase();
      const rows = db.getAllSync('SELECT * FROM animals ORDER BY name ASC');
      setAnimals(rows as any[]);
    } catch (error) {
      console.error('Error loading animals from local DB:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const syncAndReload = useCallback(async () => {
    try {
      await syncService.pullAnimals();
      const rows = db.getAllSync('SELECT * FROM animals ORDER BY name ASC');
      setAnimals(rows as any[]);
    } catch (error) {
      console.error('Error syncing animals:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnimals().then(() => syncAndReload());
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnimals().then(() => syncAndReload());
  }, [loadAnimals, syncAndReload]);

  const handleDelete = (animal: any) => {
    Alert.alert(
      'Delete Animal',
      `Are you sure you want to delete "${animal.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete locally
              db.runSync('DELETE FROM animals WHERE id = ?', [animal.id]);
              // Queue for cloud sync
              await syncService.addToQueue('DELETE', 'animals', { _id: animal.id });
              // Reload
              const rows = db.getAllSync('SELECT * FROM animals ORDER BY name ASC');
              setAnimals(rows as any[]);
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete animal');
            }
          },
        },
      ]
    );
  };

  // Filter logic
  const filteredAnimals = animals.filter((animal) => {
    const matchesSearch =
      !searchQuery ||
      animal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.rfid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.breed?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecies = selectedSpecies === 'all' || animal.species === selectedSpecies;
    return matchesSearch && matchesSpecies;
  });

  // Stats
  const speciesCount = animals.reduce((acc: Record<string, number>, a: any) => {
    if (a.species) acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </SafeAreaView>
    );
  }

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
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold text-foreground font-serif">Animals</Text>
              <Text className="text-muted-foreground mt-1">
                {animals.length} animal{animals.length !== 1 ? 's' : ''} registered
              </Text>
            </View>
            <TouchableOpacity
              className="bg-primary px-4 py-3 rounded-xl flex-row items-center shadow-sm"
              // @ts-ignore
              onPress={() => router.push('/animals/create')}
            >
              <Plus size={18} color="#fff" />
              <Text className="text-primary-foreground font-semibold ml-1.5 text-sm">Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-5 py-3">
          <View
            className="flex-row items-center bg-card border border-border rounded-xl px-4 py-2.5"
          >
            <Search size={18} color={themeColors.mutedForeground} />
            <TextInput
              placeholder="Search by name, RFID, or breed..."
              placeholderTextColor={themeColors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 text-foreground text-sm"
              style={{ color: themeColors.text }}
            />
          </View>
        </View>

        {/* Species Filter Chips */}
        <View className="px-5 pb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SPECIES_LIST.map((species) => {
              const isActive = selectedSpecies === species.value;
              const count = species.value === 'all' ? animals.length : (speciesCount[species.value] || 0);
              return (
                <TouchableOpacity
                  key={species.value}
                  onPress={() => setSelectedSpecies(species.value)}
                  className={`mr-2 px-3.5 py-2 rounded-full flex-row items-center border ${
                    isActive
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  <Text className="mr-1.5">{species.emoji}</Text>
                  <Text
                    className={`text-xs font-semibold ${
                      isActive ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {species.label}
                  </Text>
                  {count > 0 && (
                    <View
                      className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20' : 'bg-muted'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Animal Cards */}
        {filteredAnimals.length === 0 ? (
          <View className="px-5 py-12">
            <Card className="bg-card border-border">
              <CardContent className="items-center justify-center py-12">
                <Text className="text-5xl mb-4">🐾</Text>
                <Text className="text-lg font-semibold text-foreground mb-2">No animals found</Text>
                <Text className="text-sm text-muted-foreground text-center mb-4">
                  {searchQuery || selectedSpecies !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start by adding your first animal'}
                </Text>
                {!searchQuery && selectedSpecies === 'all' && (
                  <TouchableOpacity
                    className="bg-primary px-5 py-3 rounded-xl flex-row items-center"
                    // @ts-ignore
                    onPress={() => router.push('/animals/create')}
                  >
                    <Plus size={16} color="#fff" />
                    <Text className="text-primary-foreground font-semibold ml-2">Add Animal</Text>
                  </TouchableOpacity>
                )}
              </CardContent>
            </Card>
          </View>
        ) : (
          <View className="px-5 gap-3">
            {filteredAnimals.map((animal) => (
              <TouchableOpacity
                key={animal.id}
                activeOpacity={0.7}
                // @ts-ignore
                onPress={() => router.push(`/animals/${animal.id}`)}
              >
                <Card className="bg-card border-border overflow-hidden">
                  <CardContent className="p-4">
                    <View className="flex-row items-start gap-3">
                      {/* Avatar */}
                      <View className="w-16 h-16 rounded-2xl overflow-hidden bg-muted items-center justify-center border-2 border-primary/10">
                        {animal.imageUrl ? (
                          <Image
                            source={{ uri: animal.imageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Text className="text-3xl">{getSpeciesEmoji(animal.species)}</Text>
                        )}
                      </View>

                      {/* Info */}
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                            {animal.name}
                          </Text>
                          {/* Sync status indicator */}
                          {animal.syncStatus === 'pending' && (
                            <View className="flex-row items-center">
                              <CloudOff size={12} color={themeColors.mutedForeground} />
                              <Text className="text-[10px] text-muted-foreground ml-1">Pending</Text>
                            </View>
                          )}
                        </View>

                        {animal.rfid && (
                          <Text className="text-xs text-muted-foreground mb-2" numberOfLines={1}>
                            RFID: {animal.rfid}
                          </Text>
                        )}

                        {/* Tags */}
                        <View className="flex-row flex-wrap gap-1.5 mb-2">
                          <View className="bg-primary/10 px-2.5 py-1 rounded-full">
                            <Text className="text-[11px] font-semibold text-primary capitalize">
                              {animal.species || 'Unknown'}
                            </Text>
                          </View>
                          {animal.gender && (
                            <View className="bg-muted px-2.5 py-1 rounded-full">
                              <Text className="text-[11px] font-medium text-muted-foreground capitalize">
                                {animal.gender}
                              </Text>
                            </View>
                          )}
                          {animal.age != null && (
                            <View className="bg-muted px-2.5 py-1 rounded-full">
                              <Text className="text-[11px] font-medium text-muted-foreground">
                                {animal.age} {animal.ageUnit || 'months'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Breed & Farm */}
                        {animal.breed && (
                          <Text className="text-xs text-muted-foreground mb-1" numberOfLines={1}>
                            {animal.breed}
                          </Text>
                        )}
                        {animal.farmName && (
                          <View className="flex-row items-center gap-1">
                            <Text className="text-xs">🏡</Text>
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                              {animal.farmName}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Action Buttons Row */}
                    <View className="flex-row gap-2 mt-3 pt-3 border-t border-border">
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center bg-muted py-2.5 rounded-xl"
                        // @ts-ignore
                        onPress={() => router.push(`/animals/${animal.id}`)}
                      >
                        <Eye size={14} color={themeColors.foreground} />
                        <Text className="text-xs font-semibold text-foreground ml-1.5">View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center justify-center bg-muted px-4 py-2.5 rounded-xl"
                        // @ts-ignore
                        onPress={() => router.push(`/animals/${animal.id}/edit`)}
                      >
                        <Edit2 size={14} color={themeColors.foreground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center justify-center bg-destructive/10 px-4 py-2.5 rounded-xl"
                        onPress={() => handleDelete(animal)}
                      >
                        <Trash2 size={14} color={themeColors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
