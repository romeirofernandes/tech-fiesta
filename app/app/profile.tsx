import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Platform, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Pencil, Trash2, Save, X, CloudUpload, Image as ImageIcon } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface Farm {
  _id: string;
  name: string;
  location: string;
  imageUrl?: string;
  coordinates?: number[] | null;
}

export default function ProfileScreen() {
  const { mongoUser, setMongoUser, firebaseUser } = useUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    imageUrl: ""
  });
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmModalVisible, setFarmModalVisible] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [farmForm, setFarmForm] = useState<{name: string, location: string, imageUrl: string, coordinates: number[] | null}>({ name: "", location: "", imageUrl: "", coordinates: null });
  const [farmImageUploading, setFarmImageUploading] = useState(false);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const iconColor = themeColors.foreground;

  const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (mongoUser?._id) {
      fetch(`${API_URL}/api/farms?farmerId=${mongoUser._id}`)
        .then(res => res.json())
        .then(data => setFarms(Array.isArray(data) ? data : []))
        .catch(err => {
          console.error("Error fetching farms:", err);
          setFarms([]);
        });
    }
  }, [mongoUser, API_URL]);

  useEffect(() => {
    if (mongoUser) {
      setProfileForm({
        fullName: mongoUser.fullName || "",
        email: mongoUser.email || firebaseUser?.email || "",
        phoneNumber: mongoUser.phoneNumber || "",
        imageUrl: mongoUser.imageUrl || ""
      });
    }
  }, [mongoUser, firebaseUser]);

  const pickImage = async (type: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (type === 'profile') {
        handleProfileImageUpload(uri);
      } else {
        handleFarmImageUpload(uri);
      }
    }
  };

  const handleProfileImageUpload = async (uri: string) => {
    setProfileImageUploading(true);
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const res = await fetch(`${API_URL}/api/farm-images/upload`, {
        method: "POST",
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await res.json();
      if (data.url) {
        setProfileForm(prev => ({ ...prev, imageUrl: data.url }));
        Alert.alert("Success", "Profile image uploaded!");
      } else {
        Alert.alert("Error", "Upload failed");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Upload failed");
    } finally {
      setProfileImageUploading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!mongoUser?._id) return;
    try {
      const res = await fetch(`${API_URL}/api/farmers/${mongoUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMongoUser(data);
        setIsEditingProfile(false);
        Alert.alert("Success", "Profile updated!");
      } else {
        Alert.alert("Error", data.message || "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    }
  };

  const handleFarmImageUpload = async (uri: string) => {
    setFarmImageUploading(true);
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: 'farm.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const res = await fetch(`${API_URL}/api/farm-images/upload`, {
        method: "POST",
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await res.json();
      if (data.url) {
        setFarmForm(prev => ({ ...prev, imageUrl: data.url }));
        Alert.alert("Success", "Farm image uploaded!");
      } else {
        Alert.alert("Error", "Upload failed");
      }
    } catch (error) {
      Alert.alert("Error", "Upload failed");
    } finally {
      setFarmImageUploading(false);
    }
  };

  const handleFarmSave = async () => {
    if (!mongoUser?._id) return;
    const method = editingFarm ? "PUT" : "POST";
    const url = editingFarm
      ? `${API_URL}/api/farms/${editingFarm._id}`
      : `${API_URL}/api/farms`;
    const body = { ...farmForm, farmerId: mongoUser._id };
    
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setFarmModalVisible(false);
        setEditingFarm(null);
        setFarmForm({ name: "", location: "", imageUrl: "", coordinates: null });
        // Refresh farms
        fetch(`${API_URL}/api/farms?farmerId=${mongoUser._id}`)
          .then(res => res.json())
          .then(data => setFarms(data));
        Alert.alert("Success", editingFarm ? "Farm updated!" : "Farm created!");
      } else {
        Alert.alert("Error", data.message || "Failed to save farm");
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
  };

  const handleEditFarm = (farm: Farm) => {
    setEditingFarm(farm);
    setFarmForm({ 
      name: farm.name, 
      location: farm.location, 
      imageUrl: farm.imageUrl || "",
      coordinates: farm.coordinates || null 
    });
    setFarmModalVisible(true);
  };

  const handleDeleteFarm = async (farmId: string) => {
    Alert.alert(
      "Delete Farm",
      "Are you sure you want to delete this farm?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/farms/${farmId}`, { method: "DELETE" });
              if (res.ok) {
                setFarms(farms.filter(f => f._id !== farmId));
                Alert.alert("Success", "Farm deleted!");
              } else {
                Alert.alert("Error", "Failed to delete farm");
              }
            } catch {
              Alert.alert("Error", "Network error");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: 'Profile', headerShadowVisible: false, headerStyle: { backgroundColor: themeColors.background }, headerTintColor: themeColors.text }} />
      
      {/* Profile Card */}
      <Card className="mb-8 p-4">
        <View className="flex-row items-center gap-4 mb-4">
          <TouchableOpacity onPress={() => isEditingProfile && pickImage('profile')} disabled={!isEditingProfile}>
            <Avatar className="h-24 w-24" alt={profileForm.fullName}>
              <AvatarImage source={{ uri: profileForm.imageUrl || firebaseUser?.photoURL || undefined }} />
              <AvatarFallback>
                <Text>{profileForm.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "U"}</Text>
              </AvatarFallback>
            </Avatar>
            {isEditingProfile && (
              <View className="absolute bottom-0 right-0 bg-secondary rounded-full p-1 border border-border">
                <CloudUpload size={16} color={iconColor} />
              </View>
            )}
          </TouchableOpacity>
          
          <View className="flex-1">
            <CardTitle className="text-2xl">{profileForm.fullName || "Farmer"}</CardTitle>
            <Text className="text-muted-foreground">Farmer</Text>
          </View>

          <View>
            {!isEditingProfile ? (
              <Button size="icon" variant="outline" onPress={() => setIsEditingProfile(true)}>
                <Pencil size={20} color={iconColor} />
              </Button>
            ) : (
              <View className="flex-row gap-2">
                <Button size="icon" variant="ghost" onPress={() => setIsEditingProfile(false)}>
                  <X size={20} color={iconColor} />
                </Button>
                <Button size="icon" onPress={handleProfileSave}>
                  <Save size={20} color={themeColors.primaryForeground} />
                </Button>
              </View>
            )}
          </View>
        </View>

        <CardContent>
          <View className="gap-4">
            <View>
              <Text className="font-medium mb-1">Full Name</Text>
              {isEditingProfile ? (
                <Input
                  value={profileForm.fullName}
                  onChangeText={text => setProfileForm(f => ({ ...f, fullName: text }))}
                  className="bg-background"
                />
              ) : (
                <Text>{profileForm.fullName}</Text>
              )}
            </View>
            <View>
              <Text className="font-medium mb-1">Email</Text>
              {isEditingProfile ? (
                <Input
                  value={profileForm.email}
                  onChangeText={text => setProfileForm(f => ({ ...f, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-background"
                />
              ) : (
                <Text>{profileForm.email}</Text>
              )}
            </View>
            <View>
              <Text className="font-medium mb-1">Phone Number</Text>
              {isEditingProfile ? (
                <Input
                  value={profileForm.phoneNumber}
                  onChangeText={text => setProfileForm(f => ({ ...f, phoneNumber: text }))}
                  keyboardType="phone-pad"
                  className="bg-background"
                />
              ) : (
                <Text>{profileForm.phoneNumber}</Text>
              )}
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Farms Section */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-semibold">Your Farms</Text>
        <Button size="sm" onPress={() => { setEditingFarm(null); setFarmForm({ name: "", location: "", imageUrl: "", coordinates: null }); setFarmModalVisible(true); }}>
          <Plus size={16} color={themeColors.primaryForeground} />
          <Text className="ml-2 text-primary-foreground">Add Farm</Text>
        </Button>
      </View>

      <View className="gap-4 pb-20">
        {farms.map(farm => (
          <Card key={farm._id} className="overflow-hidden">
            {farm.imageUrl ? (
              <Avatar className="w-full h-40 rounded-none" alt={farm.name}>
                <AvatarImage source={{ uri: farm.imageUrl }} className="object-cover" />
                <AvatarFallback className="w-full h-40 rounded-none bg-muted items-center justify-center">
                  <ImageIcon size={40} color={iconColor} />
                </AvatarFallback>
              </Avatar>
            ) : (
               <View className="w-full h-40 bg-muted items-center justify-center">
                 <ImageIcon size={40} color={iconColor} />
               </View>
            )}
            <CardContent className="pt-4">
              <Text className="font-semibold text-lg">{farm.name}</Text>
              <Text className="text-muted-foreground text-sm">{farm.location}</Text>
              <View className="flex-row gap-2 mt-4">
                <Button size="sm" variant="outline" onPress={() => handleEditFarm(farm)} className="flex-1 flex-row items-center justify-center">
                  <Pencil size={16} color={iconColor} />
                  <Text className="ml-2">Edit</Text>
                </Button>
                <Button size="sm" variant="destructive" onPress={() => handleDeleteFarm(farm._id)} className="flex-1 flex-row items-center justify-center">
                  <Trash2 size={16} color={themeColors.destructiveForeground || '#fff'} />
                  <Text className="ml-2 text-destructive-foreground">Delete</Text>
                </Button>
              </View>
            </CardContent>
          </Card>
        ))}
        {farms.length === 0 && (
          <Text className="text-center text-muted-foreground py-8">No farms added yet.</Text>
        )}
      </View>

      {/* Farm Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={farmModalVisible}
        onRequestClose={() => setFarmModalVisible(false)}
      >
        <View className={`flex-1 justify-center px-4 bg-black/50 ${colorScheme}`}>
          <View className="w-full max-h-[80%] rounded-xl p-5 shadow-xl bg-card border border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-foreground">{editingFarm ? "Edit Farm" : "Add Farm"}</Text>
              <TouchableOpacity onPress={() => setFarmModalVisible(false)}>
                <X size={24} color={iconColor} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View className="gap-4">
                <View>
                  <Text className="font-medium mb-1 text-foreground">Farm Name</Text>
                  <Input
                    value={farmForm.name}
                    onChangeText={text => setFarmForm(f => ({ ...f, name: text }))}
                    placeholder="Farm name"
                    className="bg-background text-foreground"
                  />
                </View>

                <View>
                  <Text className="font-medium mb-1 text-foreground">Image</Text>
                  <View className="flex-row items-center gap-4">
                    {farmForm.imageUrl ? (
                      <Avatar className="w-20 h-20 rounded-lg" alt="Farm Image">
                        <AvatarImage source={{ uri: farmForm.imageUrl }} />
                        <AvatarFallback>
                          <ImageIcon size={24} color={iconColor} />
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                    <Button variant="outline" onPress={() => pickImage('farm')} disabled={farmImageUploading}>
                      <CloudUpload size={16} color={iconColor} />
                      <Text className="ml-2 text-foreground">{farmImageUploading ? "Uploading..." : "Upload"}</Text>
                    </Button>
                  </View>
                </View>

                <View>
                  <Text className="font-medium mb-1 text-foreground">Location (Lat, Lng)</Text>
                  <Input
                    value={farmForm.location}
                    onChangeText={text => setFarmForm(f => ({ ...f, location: text }))}
                    placeholder="e.g. 20.5937, 78.9629"
                    className="bg-background text-foreground"
                  />
                  <Text className="text-xs text-muted-foreground mt-1">
                    Map selection not yet available on mobile. Please enter coordinates manually.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View className="mt-6 flex-row gap-4">
               <Button className="flex-1" variant="outline" onPress={() => setFarmModalVisible(false)}>
                <Text className="text-foreground">Cancel</Text>
              </Button>
              <Button className="flex-1" onPress={handleFarmSave} disabled={farmImageUploading}>
                <Save size={16} color={themeColors.primaryForeground} />
                <Text className="ml-2 text-primary-foreground">{editingFarm ? "Save" : "Create"}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  }
});
