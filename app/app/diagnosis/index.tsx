import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  ArrowLeft,
  Camera,
  Images,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000';

function getMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

export default function DiagnosisScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to photos to continue.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!res.canceled) {
        setImageUri(res.assets[0].uri);
        setResult(null);
        setErrorMsg(null);
      }
    } catch {
      Alert.alert('Error', 'Could not open gallery. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow camera access to take a photo.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!res.canceled) {
        setImageUri(res.assets[0].uri);
        setResult(null);
        setErrorMsg(null);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const mime = getMimeType(imageUri);
      const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: mime,
        name: `diagnosis.${ext}`,
      } as any);

      const response = await axios.post(
        `${API_BASE_URL}/api/disease-detect/analyze`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        }
      );

      if (response.data?.success) {
        setResult(response.data.data);
      } else {
        setErrorMsg(response.data?.message || 'Analysis returned no result.');
      }
    } catch (err: any) {
      console.error('[Diagnosis] Request failed:', err?.message, err?.response?.data);
      const msg =
        err?.response?.data?.message ||
        (err?.code === 'ECONNABORTED'
          ? 'Request timed out — the server may be waking up. Please try again.'
          : 'Failed to reach the server. Check your internet connection.');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setImageUri(null);
    setResult(null);
    setErrorMsg(null);
  };

  const severityColor = (s: string) => {
    const v = s?.toLowerCase();
    if (v === 'critical' || v === 'high') return themeColors.destructive;
    if (v === 'medium') return '#f97316';
    return '#eab308';
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: themeColors.muted }]}
          >
            <ArrowLeft size={20} color={themeColors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.foreground }}>
              AI Disease Check
            </Text>
            <Text style={{ fontSize: 11, color: themeColors.mutedForeground, marginTop: 1 }}>
              Powered by Gemini Vision
            </Text>
          </View>
          {(imageUri || result) && (
            <TouchableOpacity onPress={clearAll} style={[styles.clearBtn, { borderColor: themeColors.border }]}>
              <Text style={{ fontSize: 11, color: themeColors.mutedForeground, fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, gap: 14 }}>

          {/* Upload Zone */}
          {!imageUri ? (
            <View style={[styles.uploadBox, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <View style={[styles.uploadIcon, { backgroundColor: themeColors.muted }]}>
                <Stethoscope size={36} color={themeColors.mutedForeground} strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: themeColors.foreground, marginTop: 12 }}>
                Upload Animal Photo
              </Text>
              <Text style={{ fontSize: 12, color: themeColors.mutedForeground, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
                Take a clear photo of the affected area for an AI health assessment
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
                <TouchableOpacity
                  onPress={takePhoto}
                  style={[styles.uploadBtn, { backgroundColor: themeColors.primary, flex: 1 }]}
                >
                  <Camera size={16} color={themeColors.primaryForeground} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: themeColors.primaryForeground, marginLeft: 6 }}>
                    Camera
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickFromGallery}
                  style={[styles.uploadBtn, { flex: 1, backgroundColor: themeColors.secondary }]}
                >
                  <Images size={16} color={themeColors.foreground} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: themeColors.foreground, marginLeft: 6 }}>
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 10, color: themeColors.mutedForeground, marginTop: 12 }}>
                JPG • PNG • up to 10 MB
              </Text>
            </View>
          ) : (
            /* Image Preview */
            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: 220, borderRadius: 12 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={clearAll}
                  style={[styles.removeBtn, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
                >
                  <X size={15} color={themeColors.foreground} />
                </TouchableOpacity>
                <View style={styles.changeRow}>
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={[styles.changeChip, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                  >
                    <Camera size={12} color="#fff" />
                    <Text style={{ fontSize: 10, color: '#fff', marginLeft: 4, fontWeight: '600' }}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickFromGallery}
                    style={[styles.changeChip, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                  >
                    <Images size={12} color="#fff" />
                    <Text style={{ fontSize: 10, color: '#fff', marginLeft: 4, fontWeight: '600' }}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!result && (
                <TouchableOpacity
                  onPress={loading ? undefined : handleAnalyze}
                  disabled={loading}
                  style={[
                    styles.analyzeBtn,
                    { backgroundColor: loading ? themeColors.muted : themeColors.primary },
                  ]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color={loading ? themeColors.mutedForeground : themeColors.primaryForeground} size={15} />
                      <Text style={[styles.analyzeBtnText, { color: themeColors.mutedForeground, marginLeft: 8 }]}>
                        Analyzing with Gemini Vision…
                      </Text>
                    </>
                  ) : (
                    <>
                      <Stethoscope size={16} color={themeColors.primaryForeground} />
                      <Text style={[styles.analyzeBtnText, { color: themeColors.primaryForeground, marginLeft: 8 }]}>
                        Run AI Diagnosis
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <View style={[styles.errorBanner, { backgroundColor: themeColors.destructive + '15', borderColor: themeColors.destructive + '40' }]}>
              <AlertCircle size={16} color={themeColors.destructive} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.destructive }}>Analysis Failed</Text>
                <Text style={{ fontSize: 11, color: themeColors.destructive, marginTop: 2, lineHeight: 16 }}>{errorMsg}</Text>
              </View>
              <TouchableOpacity onPress={handleAnalyze} style={{ marginLeft: 8 }}>
                <RefreshCcw size={16} color={themeColors.destructive} />
              </TouchableOpacity>
            </View>
          )}

          {/* Results */}
          {result && !loading && (
            <View style={{ gap: 12 }}>

              {/* Overview */}
              <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[styles.diagnosisIcon, { backgroundColor: themeColors.primary + '18' }]}>
                    <Stethoscope size={22} color={themeColors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: themeColors.mutedForeground, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                      Suspected Condition
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: themeColors.foreground, lineHeight: 22 }}>
                      {result.diagnosis}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  <View style={[styles.chip, { backgroundColor: themeColors.muted }]}>
                    <View style={[styles.chipDot, { backgroundColor: '#3b82f6' }]} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: themeColors.foreground }}>
                      {result.confidence} Confidence
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: severityColor(result.severity) + '18' }]}>
                    <View style={[styles.chipDot, { backgroundColor: severityColor(result.severity) }]} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: severityColor(result.severity) }}>
                      {result.severity} Severity
                    </Text>
                  </View>
                  {result.vet_needed && (
                    <View style={[styles.chip, { backgroundColor: themeColors.destructive + '18' }]}>
                      <ShieldAlert size={11} color={themeColors.destructive} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.destructive, marginLeft: 4 }}>
                        Vet Visit Needed
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Vet Alert */}
              {result.vet_needed && (
                <View style={[styles.vetAlert, { backgroundColor: themeColors.destructive + '12', borderColor: themeColors.destructive + '35' }]}>
                  <AlertTriangle size={18} color={themeColors.destructive} style={{ flexShrink: 0, marginTop: 1 }} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.destructive }}>Veterinarian Required</Text>
                    <Text style={{ fontSize: 11, color: themeColors.destructive + 'cc', marginTop: 3, lineHeight: 16 }}>
                      This condition needs professional attention. Please contact your vet as soon as possible.
                    </Text>
                  </View>
                </View>
              )}

              {/* Symptoms */}
              {result.symptoms_identified?.length > 0 && (
                <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, { backgroundColor: '#f97316' + '20' }]}>
                      <AlertCircle size={14} color="#f97316" />
                    </View>
                    <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Symptoms Identified</Text>
                  </View>
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {result.symptoms_identified.map((s: string, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <View style={[styles.bullet, { backgroundColor: '#f97316', marginTop: 7 }]} />
                        <Text style={{ fontSize: 13, color: themeColors.foreground, opacity: 0.85, flex: 1, lineHeight: 19 }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* What To Do */}
              {result.immediate_actions?.length > 0 && (
                <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, { backgroundColor: themeColors.primary + '18' }]}>
                      <CheckCircle2 size={14} color={themeColors.primary} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>What To Do</Text>
                  </View>
                  <View style={{ gap: 10, marginTop: 10 }}>
                    {result.immediate_actions.map((action: string, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <View style={[styles.stepNum, { backgroundColor: themeColors.primary }]}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: themeColors.primaryForeground }}>{i + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: themeColors.foreground, opacity: 0.85, flex: 1, lineHeight: 19 }}>{action}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Disclaimer */}
              <View style={[styles.disclaimer, { backgroundColor: themeColors.muted + '80', borderColor: themeColors.border }]}>
                <Text style={{ fontSize: 10, color: themeColors.mutedForeground, lineHeight: 15 }}>
                  ⓘ  AI assessment only — not a substitute for professional veterinary care. Always consult a licensed vet for diagnosis and treatment.
                </Text>
              </View>

              {/* New Diagnosis */}
              <TouchableOpacity
                onPress={clearAll}
                style={[styles.newBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
              >
                <RefreshCcw size={15} color={themeColors.mutedForeground} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: themeColors.mutedForeground, marginLeft: 8 }}>
                  Start New Diagnosis
                </Text>
              </TouchableOpacity>

            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    marginBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  changeRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 10,
  },
  analyzeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  diagnosisIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  vetAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  disclaimer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 2,
  },
});
