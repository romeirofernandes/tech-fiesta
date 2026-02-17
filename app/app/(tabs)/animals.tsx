import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Edit2,
  Beef,
  Bird,
  Rabbit,
  Bug,
  CloudOff,
  ChevronDown,
  Tractor,
  Layers,
  Check,
  X,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { db } from '@/lib/db';
import { syncService } from '@/services/SyncService';

// Species configuration with icons instead of emojis
const SPECIES_CONFIG: Record<string, { label: string; Icon: any }> = {
  all: { label: 'All Species', Icon: Layers },
  cow: { label: 'Cow', Icon: Beef },
  buffalo: { label: 'Buffalo', Icon: Beef },
  goat: { label: 'Goat', Icon: Rabbit },
  sheep: { label: 'Sheep', Icon: Rabbit },
  chicken: { label: 'Chicken', Icon: Bird },
  pig: { label: 'Pig', Icon: Beef },
  horse: { label: 'Horse', Icon: Beef },
  other: { label: 'Other', Icon: Bug },
};

const getSpeciesIcon = (species: string) => {
  const config = SPECIES_CONFIG[species?.toLowerCase()] || SPECIES_CONFIG.other;
  return config.Icon;
};

// ---- Custom Filter Dropdown Component ----
type FilterOption = { value: string; label: string };

function FilterDropdown({
  options,
  selected,
  onSelect,
  title,
  icon,
  themeColors,
}: {
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  title: string;
  icon: React.ReactNode;
  themeColors: any;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === selected)?.label || title;

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: themeColors.border,
          backgroundColor: themeColors.card,
          height: 42,
          paddingHorizontal: 12,
          borderRadius: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
          {icon}
          <Text
            className="text-sm text-foreground ml-2"
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {selectedLabel}
          </Text>
        </View>
        <ChevronDown size={16} color={themeColors.mutedForeground} />
      </TouchableOpacity>

      {/* Modal Dropdown */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: themeColors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '50%',
              paddingBottom: 32,
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: themeColors.border,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: themeColors.border,
              }}
            >
              <Text className="text-base font-bold text-foreground">{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <X size={20} color={themeColors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isActive = item.value === selected;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onSelect(item.value);
                      setOpen(false);
                    }}
                    activeOpacity={0.6}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: isActive
                        ? themeColors.primary + '15'
                        : 'transparent',
                    }}
                  >
                    <Text
                      className={`text-sm ${isActive ? 'font-bold' : 'font-normal'}`}
                      style={{ color: isActive ? themeColors.primary : themeColors.text }}
                    >
                      {item.label}
                    </Text>
                    {isActive && <Check size={18} color={themeColors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ---- Main Screen ----
export default function AnimalsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[colorScheme ?? 'light'];

  const { mongoUser, loading: userLoading } = useUser();
  const [animals, setAnimals] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedFarm, setSelectedFarm] = useState('all');

  const loadAnimals = useCallback(async () => {
    try {
      const animalRows = db.getAllSync('SELECT * FROM animals ORDER BY name ASC');
      setAnimals(animalRows as any[]);

      const farmRows = db.getAllSync('SELECT * FROM farms ORDER BY name ASC');
      setFarms(farmRows as any[]);
    } catch (error) {
      console.error('Error loading animals from local DB:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const syncAndReload = useCallback(async () => {
    try {
      if (mongoUser?._id) {
        await syncService.pullAnimals({ farmerId: mongoUser._id });
        await syncService.pullFarms(mongoUser._id);
        const animalRows = db.getAllSync('SELECT * FROM animals ORDER BY name ASC');
        const farmRows = db.getAllSync('SELECT * FROM farms ORDER BY name ASC');
        setAnimals(animalRows as any[]);
        setFarms(farmRows as any[]);
      }
    } catch (error) {
      console.error('Error syncing animals:', error);
    }
  }, [mongoUser?._id]);

  useFocusEffect(
    useCallback(() => {
      if (!userLoading) {
        loadAnimals().then(() => syncAndReload());
      }
    }, [userLoading, mongoUser?._id])
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
              db.runSync('DELETE FROM animals WHERE id = ?', [animal.id]);
              await syncService.addToQueue('DELETE', 'animals', { _id: animal.id });
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
    const matchesFarm = selectedFarm === 'all' || animal.farmId === selectedFarm;
    return matchesSearch && matchesSpecies && matchesFarm;
  });

  // Build options for dropdowns
  const farmOptions: FilterOption[] = [
    { value: 'all', label: 'All Farms' },
    ...farms.map((f) => ({ value: f.id, label: f.name })),
  ];

  const speciesOptions: FilterOption[] = Object.entries(SPECIES_CONFIG).map(
    ([value, config]) => ({ value, label: config.label })
  );

  if (loading || userLoading) {
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
          <View className="flex-row items-center bg-card border border-border rounded-xl px-4 py-2.5">
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

        {/* Filter Dropdowns */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FilterDropdown
              options={farmOptions}
              selected={selectedFarm}
              onSelect={setSelectedFarm}
              title="Filter by Farm"
              icon={<Tractor size={16} color={themeColors.primary} />}
              themeColors={themeColors}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FilterDropdown
              options={speciesOptions}
              selected={selectedSpecies}
              onSelect={setSelectedSpecies}
              title="Filter by Species"
              icon={React.createElement(SPECIES_CONFIG[selectedSpecies]?.Icon || Layers, {
                size: 16,
                color: themeColors.primary,
              })}
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* Animal Cards */}
        {filteredAnimals.length === 0 ? (
          <View className="px-5 py-12">
            <Card className="bg-card border-border">
              <CardContent className="items-center justify-center py-12">
                <Layers size={48} color={themeColors.mutedForeground} style={{ marginBottom: 16 }} />
                <Text className="text-lg font-semibold text-foreground mb-2">No animals found</Text>
                <Text className="text-sm text-muted-foreground text-center mb-4">
                  {searchQuery || selectedSpecies !== 'all' || selectedFarm !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start by adding your first animal'}
                </Text>
                {!searchQuery && selectedSpecies === 'all' && selectedFarm === 'all' && (
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
                          React.createElement(getSpeciesIcon(animal.species), {
                            size: 28,
                            color: themeColors.primary,
                          })
                        )}
                      </View>

                      {/* Info */}
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                            {animal.name}
                          </Text>
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

