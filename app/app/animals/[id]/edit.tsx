import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Camera,
  Image as ImageIcon,
  X,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { db } from '@/lib/db';
import { syncService } from '@/services/SyncService';
import * as ImagePicker from 'expo-image-picker';

const SPECIES_OPTIONS = [
  { value: 'cow', label: 'Cow', emoji: '🐄' },
  { value: 'buffalo', label: 'Buffalo', emoji: '🐃' },
  { value: 'goat', label: 'Goat', emoji: '🐐' },
  { value: 'sheep', label: 'Sheep', emoji: '🐑' },
  { value: 'chicken', label: 'Chicken', emoji: '🐔' },
  { value: 'pig', label: 'Pig', emoji: '🐷' },
  { value: 'horse', label: 'Horse', emoji: '🐴' },
  { value: 'other', label: 'Other', emoji: '🐾' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const AGE_UNIT_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export default function EditAnimalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [farms, setFarms] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [rfid, setRfid] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [farmId, setFarmId] = useState('');
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  // Dropdown visibility
  const [showSpecies, setShowSpecies] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [showAgeUnit, setShowAgeUnit] = useState(false);
  const [showFarm, setShowFarm] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load farms
      const farmRows = db.getAllSync('SELECT * FROM farms ORDER BY name ASC');
      setFarms(farmRows as any[]);

      // Load animal
      const animal = db.getFirstSync('SELECT * FROM animals WHERE id = ?', [id]) as any;
      if (animal) {
        setName(animal.name || '');
        setRfid(animal.rfid || '');
        setSpecies(animal.species || '');
        setBreed(animal.breed || '');
        setGender(animal.gender || '');
        setAge(animal.age != null ? String(animal.age) : '');
        setAgeUnit(animal.ageUnit || 'months');
        setFarmId(animal.farmId || '');
        setCurrentImageUrl(animal.imageUrl || null);
      }
    } catch (error) {
      console.error('Error loading animal data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled) {
        setNewImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled) {
        setNewImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const validate = () => {
    if (!name.trim()) { Alert.alert('Validation', 'Please enter animal name'); return false; }
    if (!rfid.trim()) { Alert.alert('Validation', 'Please enter RFID tag'); return false; }
    if (!species) { Alert.alert('Validation', 'Please select species'); return false; }
    if (!breed.trim()) { Alert.alert('Validation', 'Please enter breed'); return false; }
    if (!gender) { Alert.alert('Validation', 'Please select gender'); return false; }
    if (!age || Number(age) <= 0) { Alert.alert('Validation', 'Please enter valid age'); return false; }
    if (!farmId) { Alert.alert('Validation', 'Please select a farm'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const now = new Date().toISOString();
      const selectedFarm = farms.find((f: any) => f.id === farmId);

      const animalData: any = {
        _id: id,
        name: name.trim(),
        rfid: rfid.trim(),
        species,
        breed: breed.trim(),
        gender,
        age: Number(age),
        ageUnit,
        farmId,
      };

      // Only attach new image URI if changed
      if (newImageUri) {
        animalData.imageUri = newImageUri;
      }
      // If we have a new local image, display it immediately
      // If no new image, keep current (which might be null or remote URL)
      const displayImage = newImageUri || currentImageUrl;

      // Update in local DB
      db.runSync(
        `UPDATE animals SET 
          name = ?, rfid = ?, species = ?, breed = ?, gender = ?, 
          age = ?, ageUnit = ?, farmId = ?, farmName = ?, farmLocation = ?,
          updatedAt = ?, syncStatus = ?, imageUrl = ?
        WHERE id = ?`,
        [
          animalData.name,
          animalData.rfid,
          animalData.species,
          animalData.breed,
          animalData.gender,
          animalData.age,
          animalData.ageUnit,
          animalData.farmId,
          selectedFarm?.name || null,
          selectedFarm?.location || null,
          now,
          'pending',
          displayImage, // Store updated image display
          id,
        ]
      );

      // Queue for cloud sync
      await syncService.addToQueue('UPDATE', 'animals', animalData);

      Alert.alert('Success', 'Animal updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Update animal error:', error);
      Alert.alert('Error', 'Failed to update animal');
    } finally {
      setLoading(false);
    }
  };

  const selectedSpeciesObj = SPECIES_OPTIONS.find((s) => s.value === species);
  const selectedFarmObj = farms.find((f: any) => f.id === farmId);
  const activeImage = newImageUri || currentImageUrl;

  if (initialLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={themeColors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-row items-center bg-muted px-3 py-2 rounded-xl"
              onPress={() => router.back()}
            >
              <ArrowLeft size={18} color={themeColors.foreground} />
              <Text className="text-sm font-semibold text-foreground ml-1.5">Back</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-foreground">Edit Animal</Text>
            <View className="w-16" />
          </View>

          {/* Image Picker */}
          <View className="items-center py-6">
            <View className="w-32 h-32 rounded-3xl bg-muted/50 items-center justify-center border-2 border-dashed border-border overflow-hidden relative">
              {activeImage ? (
                <>
                  <Image source={{ uri: activeImage }} className="w-full h-full" resizeMode="cover" />
                  <TouchableOpacity 
                    className="absolute top-1 right-1 bg-black/50 p-1.5 rounded-full"
                    onPress={() => {
                        setNewImageUri(null);
                        setCurrentImageUrl(null); 
                        // Note: Setting currentImageUrl to null deletes it from view but we don't handle DELETE image api call here specifically
                        // For this basic flow, we just allow replacing. 
                    }}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </>
              ) : (
                <View className="items-center justify-center p-4">
                  {selectedSpeciesObj ? (
                    <Text className="text-4xl mb-2">{selectedSpeciesObj.emoji}</Text>
                  ) : (
                    <Camera size={28} color={themeColors.mutedForeground} className="mb-2" />
                  )}
                  <Text className="text-[10px] text-muted-foreground text-center">Change Photo</Text>
                </View>
              )}
            </View>
            
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity 
                className="flex-row items-center bg-primary/10 px-4 py-2.5 rounded-xl"
                onPress={pickImage}
              >
                <ImageIcon size={16} color={themeColors.primary} />
                <Text className="ml-2 text-xs font-bold text-primary">Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-row items-center bg-primary px-4 py-2.5 rounded-xl shadow-sm"
                onPress={takePhoto}
              >
                <Camera size={16} color="#fff" />
                <Text className="ml-2 text-xs font-bold text-primary-foreground">Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Card */}
          <View className="px-5">
            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-5 gap-5">
                {/* Name */}
                <View>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Animal Name *
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Bella"
                    placeholderTextColor={themeColors.mutedForeground}
                    className="bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                    style={{ color: themeColors.text }}
                  />
                </View>

                {/* RFID */}
                <View>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    RFID Tag *
                  </Text>
                  <TextInput
                    value={rfid}
                    onChangeText={setRfid}
                    placeholder="e.g., RF001234"
                    placeholderTextColor={themeColors.mutedForeground}
                    className="bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                    style={{ color: themeColors.text }}
                  />
                </View>

                {/* Species Dropdown */}
                <View>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Species *
                  </Text>
                  <TouchableOpacity
                    className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                    onPress={() => { setShowSpecies(!showSpecies); setShowGender(false); setShowAgeUnit(false); setShowFarm(false); }}
                  >
                    <Text className={`text-sm ${species ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {selectedSpeciesObj ? `${selectedSpeciesObj.emoji} ${selectedSpeciesObj.label}` : 'Select species'}
                    </Text>
                    <ChevronDown size={16} color={themeColors.mutedForeground} />
                  </TouchableOpacity>
                  {showSpecies && (
                    <View className="bg-card border border-border rounded-xl mt-2 overflow-hidden shadow-sm">
                      {SPECIES_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          className={`px-4 py-3 border-b border-border flex-row items-center justify-between ${
                            species === opt.value ? 'bg-primary/5' : ''
                          }`}
                          onPress={() => { setSpecies(opt.value); setShowSpecies(false); }}
                        >
                          <Text className="text-sm text-foreground">
                            {opt.emoji} {opt.label}
                          </Text>
                          {species === opt.value && <Check size={16} color={themeColors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Breed */}
                <View>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Breed *
                  </Text>
                  <TextInput
                    value={breed}
                    onChangeText={setBreed}
                    placeholder="e.g., Holstein"
                    placeholderTextColor={themeColors.mutedForeground}
                    className="bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                    style={{ color: themeColors.text }}
                  />
                </View>

                {/* Gender Dropdown */}
                <View>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Gender *
                  </Text>
                  <TouchableOpacity
                    className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                    onPress={() => { setShowGender(!showGender); setShowSpecies(false); setShowAgeUnit(false); setShowFarm(false); }}
                  >
                    <Text className={`text-sm ${gender ? 'text-foreground capitalize' : 'text-muted-foreground'}`}>
                      {gender || 'Select gender'}
                    </Text>
                    <ChevronDown size={16} color={themeColors.mutedForeground} />
                  </TouchableOpacity>
                  {showGender && (
                    <View className="bg-card border border-border rounded-xl mt-2 overflow-hidden shadow-sm">
                      {GENDER_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          className={`px-4 py-3 border-b border-border flex-row items-center justify-between ${
                            gender === opt.value ? 'bg-primary/5' : ''
                          }`}
                          onPress={() => { setGender(opt.value); setShowGender(false); }}
                        >
                          <Text className="text-sm text-foreground">{opt.label}</Text>
                          {gender === opt.value && <Check size={16} color={themeColors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Age + Unit Row */}
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Age *
                    </Text>
                    <TextInput
                      value={age}
                      onChangeText={setAge}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={themeColors.mutedForeground}
                      className="bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                      style={{ color: themeColors.text }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Unit
                    </Text>
                    <TouchableOpacity
                      className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                      onPress={() => { setShowAgeUnit(!showAgeUnit); setShowSpecies(false); setShowGender(false); setShowFarm(false); }}
                    >
                      <Text className="text-sm text-foreground capitalize">{ageUnit}</Text>
                      <ChevronDown size={16} color={themeColors.mutedForeground} />
                    </TouchableOpacity>
                    {showAgeUnit && (
                      <View className="bg-card border border-border rounded-xl mt-2 overflow-hidden shadow-sm">
                        {AGE_UNIT_OPTIONS.map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            className={`px-4 py-3 border-b border-border flex-row items-center justify-between ${
                              ageUnit === opt.value ? 'bg-primary/5' : ''
                            }`}
                            onPress={() => { setAgeUnit(opt.value); setShowAgeUnit(false); }}
                          >
                            <Text className="text-sm text-foreground">{opt.label}</Text>
                            {ageUnit === opt.value && <Check size={16} color={themeColors.primary} />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Farm Dropdown */}
                <View>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Farm *
                  </Text>
                  <TouchableOpacity
                    className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                    onPress={() => { setShowFarm(!showFarm); setShowSpecies(false); setShowGender(false); setShowAgeUnit(false); }}
                  >
                    <Text className={`text-sm ${farmId ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {selectedFarmObj ? `🏡 ${selectedFarmObj.name}` : 'Select a farm'}
                    </Text>
                    <ChevronDown size={16} color={themeColors.mutedForeground} />
                  </TouchableOpacity>
                  {showFarm && (
                    <View className="bg-card border border-border rounded-xl mt-2 overflow-hidden shadow-sm">
                      {farms.length === 0 ? (
                        <View className="px-4 py-3">
                          <Text className="text-sm text-muted-foreground">No farms available</Text>
                        </View>
                      ) : (
                        farms.map((farm: any) => (
                          <TouchableOpacity
                            key={farm.id}
                            className={`px-4 py-3 border-b border-border flex-row items-center justify-between ${
                              farmId === farm.id ? 'bg-primary/5' : ''
                            }`}
                            onPress={() => { setFarmId(farm.id); setShowFarm(false); }}
                          >
                            <Text className="text-sm text-foreground">🏡 {farm.name}</Text>
                            {farmId === farm.id && <Check size={16} color={themeColors.primary} />}
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Submit Button */}
          <View className="px-5 pt-5">
            <TouchableOpacity
              className={`bg-primary py-4 rounded-xl flex-row items-center justify-center shadow-sm ${loading ? 'opacity-60' : ''}`}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text className="text-primary-foreground font-bold text-base ml-2">
                    Save Changes
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
