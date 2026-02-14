
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, MapPin, X, ArrowLeft, Loader2, Navigation } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { db, initDatabase } from '@/lib/db';
import { syncService } from '@/services/SyncService';

export default function CreateFarmScreen() {
    const router = useRouter();
    const { mongoUser } = useUser();
    const { colorScheme } = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];
    
    const [name, setName] = useState('');
    const [locationText, setLocationText] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageUploading, setImageUploading] = useState(false);
    
    // Map & Location State
    const [region, setRegion] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [coordinate, setCoordinate] = useState<{latitude: number, longitude: number} | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    
    const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }
            getCurrentLocation();
        })();
    }, []);

    const getCurrentLocation = async () => {
        setLocationLoading(true);
        try {
            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            setRegion(prev => ({ ...prev, latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }));
            setCoordinate({ latitude, longitude });
            // Ideally reverse geocode here to get address text
            const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverseGeocode.length > 0) {
                const addr = reverseGeocode[0];
                const addrText = `${addr.city || ''} ${addr.region || ''}, ${addr.country || ''}`.trim();
                if (addrText) setLocationText(addrText);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not fetch current location.");
        } finally {
            setLocationLoading(false);
        }
    };

    const pickImage = async (useCamera: boolean) => {
        let result;
        if (useCamera) {
             const permission = await ImagePicker.requestCameraPermissionsAsync();
             if (permission.status !== 'granted') {
                 Alert.alert("Camera permission denied");
                 return;
             }
             result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
             });
        } else {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
            });
        }

        if (!result.canceled) {
            handleImageUpload(result.assets[0].uri);
        }
    };

    const handleImageUpload = async (uri: string) => {
        setImageUploading(true);
        try {
            if (await syncService.isOnline()) {
                const formData = new FormData();
                formData.append("image", {
                  uri,
                  name: 'farm.jpg',
                  type: 'image/jpeg',
                } as any);
    
                const res = await fetch(`${API_URL}/api/farm-images/upload`, {
                    method: "POST",
                    body: formData,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const data = await res.json();
                if (data.url) {
                    setImageUrl(data.url);
                    Alert.alert("Success", "Image uploaded!");
                }
            } else {
                 Alert.alert("Offline", "Please connect to internet to upload new images. Using local URI for display.");
                 setImageUrl(uri); // Use local URI temporarily
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Upload failed");
            setImageUrl(uri); // Fallback to local
        } finally {
            setImageUploading(false);
        }
    };
    
    const handleSave = async () => {
        if (!name) {
            Alert.alert("Error", "Please enter a farm name");
            return;
        }
        if (!mongoUser?._id) {
            Alert.alert("Error", "User not authenticated properly");
            return;
        }

        try {
            await initDatabase();
            const tempId = Date.now().toString();
            
            const farmData = {
                id: tempId,
                name,
                location: locationText,
                imageUrl: imageUrl,
                coordinates: coordinate ? coordinate : { latitude: region.latitude, longitude: region.longitude }, 
                farmerId: mongoUser._id,
                syncStatus: 'pending'
            };

            // Save locally
            db.runSync(
                `INSERT INTO farms (id, name, location, imageUrl, coordinates, farmerId, syncStatus, tempId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [tempId, farmData.name, farmData.location, farmData.imageUrl, JSON.stringify(farmData.coordinates), farmData.farmerId, 'pending', tempId]
            );
            
            // Queue sync
            await syncService.addToQueue('CREATE', 'farms', { ...farmData, tempId });
            
            Alert.alert("Success", "Farm created successfully!");
            router.back();
            router.replace('/(tabs)'); // Refresh dashboard ideally via context or event, but navigation back works

        } catch (error) {
            console.error("Save Farm Error:", error);
            Alert.alert("Error", "Failed to save farm locally.");
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1 bg-background" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
                {/* Header */}
                <View className="px-4 py-3 flex-row items-center border-b border-border bg-background z-10">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                        <ArrowLeft size={24} color={themeColors.text} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-foreground">Add New Farm</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    
                    {/* Image Section */}
                    <Card className="mb-6 overflow-hidden border-dashed border-2 bg-muted/20">
                         {imageUrl ? (
                             <View>
                                 <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 200 }} contentFit="cover" />
                                 <TouchableOpacity 
                                    className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                                    onPress={() => setImageUrl('')}
                                 >
                                     <X size={16} color="#fff" />
                                 </TouchableOpacity>
                             </View>
                         ) : (
                             <View className="h-48 items-center justify-center gap-4">
                                 <View className="flex-row gap-4">
                                     <Button variant="outline" onPress={() => pickImage(true)} disabled={imageUploading}>
                                         <Camera size={20} color={themeColors.text} />
                                         <Text className="ml-2 text-foreground">Take Photo</Text>
                                     </Button>
                                     <Button variant="outline" onPress={() => pickImage(false)} disabled={imageUploading}>
                                         <MapPin size={20} color={themeColors.text} />
                                         <Text className="ml-2 text-foreground">Gallery</Text> 
                                     </Button>
                                 </View>
                                 {imageUploading && <ActivityIndicator />}
                             </View>
                         )}
                    </Card>

                    {/* Form Fields */}
                    <View className="gap-4 mb-6">
                        <View>
                            <Text className="font-medium mb-1.5 text-foreground">Farm Name</Text>
                            <Input
                                value={name}
                                onChangeText={setName}
                                placeholder="My Dairy Farm"
                                className="bg-background text-foreground text-lg"
                            />
                        </View>
                        
                        <View>
                            <View className="flex-row justify-between items-center mb-1.5">
                                <Text className="font-medium text-foreground">Location</Text>
                                <TouchableOpacity 
                                    className="flex-row items-center bg-primary/10 px-2 py-1 rounded"
                                    onPress={getCurrentLocation}
                                    disabled={locationLoading}
                                >
                                    {locationLoading ? (
                                        <Loader2 size={12} color={themeColors.primary} className="animate-spin mr-1" />
                                    ) : (
                                        <Navigation size={12} color={themeColors.primary} className="mr-1" />
                                    )}
                                    <Text className="text-xs font-semibold text-primary">Use Current Location</Text>
                                </TouchableOpacity>
                            </View>
                            <Input
                                value={locationText}
                                onChangeText={setLocationText}
                                placeholder="City, State"
                                className="bg-background text-foreground"
                            />
                        </View>
                    </View>

                    {/* Map Selection */}
                    <View className="mb-6">
                        <Text className="font-medium mb-2 text-foreground">Pin Location on Map</Text>
                        <View className="h-64 rounded-xl overflow-hidden border border-border relative">
                            <MapView
                                provider={PROVIDER_DEFAULT}
                                style={StyleSheet.absoluteFill}
                                region={region}
                                onRegionChangeComplete={setRegion}
                                onPress={(e) => setCoordinate(e.nativeEvent.coordinate)}
                            >
                                {coordinate && (
                                    <Marker coordinate={coordinate} />
                                )}
                            </MapView>
                            
                            {!coordinate && (
                                <View className="absolute top-1/2 left-1/2 -ml-3 -mt-6 pointer-events-none">
                                     <MapPin size={24} color={themeColors.primary} fill={themeColors.background} />
                                </View>
                            )}
                            
                            <View className="absolute bottom-2 right-2 bg-background/90 p-2 rounded border border-border">
                                <Text className="text-xs text-muted-foreground">Tap map to set pin</Text>
                            </View>
                        </View>
                    </View>

                    <Button onPress={handleSave} className="w-full h-12" disabled={imageUploading}>
                         <Text className="font-bold text-base text-primary-foreground">Create Farm</Text>
                    </Button>

                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

// Add these imports at the top
import { SafeAreaView } from 'react-native-safe-area-context';
