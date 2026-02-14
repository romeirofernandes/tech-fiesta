import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import {
  signInWithEmailAndPassword,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useUser } from '@/context/UserContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setMongoUser } = useUser();
  const { colorScheme } = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const normalizePhone = (input: string) => {
    if (!input) return input;
    const trimmed = input.trim();
    if (trimmed.startsWith('+')) return trimmed;

    const digits = trimmed.replace(/\D/g, '');

    if (/^\d{10}$/.test(digits)) return `+91${digits}`;
    if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;
    if (/^91\d{10}$/.test(digits)) return `+${digits}`;

    return digits.length ? `+${digits}` : input;
  };

  const syncWithBackend = async (firebaseUid: string, phoneNumber?: string) => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/farmers/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firebaseUid, phoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        await setMongoUser(data);
        Alert.alert('Success', 'Login successful!');
        router.replace('/(tabs)');
      } else {
        if (response.status === 404) {
          Alert.alert('Error', 'Account not found. Please register first.');
        } else {
          Alert.alert('Error', data.message || 'Backend sync failed');
        }
        await auth.signOut();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error connecting to backend');
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await syncWithBackend(user.uid);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    setLoading(true);
    const formattedPhone = normalizePhone(phone);

    try {
      // Note: Phone auth on React Native requires Firebase reCAPTCHA which needs special setup
      // For now, we'll show an alert that this feature requires additional configuration
      Alert.alert(
        'Phone Authentication',
        'Phone authentication on mobile requires additional Firebase setup with reCAPTCHA verification. Please use email login or configure Firebase phone auth in your Firebase console.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter complete OTP');
      return;
    }

    setLoading(true);
    try {
      if (!verificationId) {
        throw new Error('No verification ID');
      }

      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      const normalized = normalizePhone(phone);
      await syncWithBackend(user.uid, normalized);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Invalid OTP');
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.keyboardAvoid, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <ThemedView style={styles.header}>
          <ThemedText style={[styles.title, { color: colors.primary }]}>पशु पहचान</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Welcome back to your livestock hub
          </ThemedText>
        </ThemedView>

        {/* Card */}
        <ThemedView
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.foreground,
            },
          ]}>
          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'email' && [
                  styles.tabButtonActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveTab('email')}>
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color:
                      activeTab === 'email' ? colors.primaryForeground : colors.mutedForeground,
                    fontWeight: activeTab === 'email' ? '700' : '500',
                  },
                ]}>
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'phone' && [
                  styles.tabButtonActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveTab('phone')}>
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color:
                      activeTab === 'phone' ? colors.primaryForeground : colors.mutedForeground,
                    fontWeight: activeTab === 'phone' ? '700' : '500',
                  },
                ]}>
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'email' ? (
            <View style={styles.content}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.foreground }]}>Email</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.input,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.foreground }]}>Password</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.input,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleEmailLogin}
                disabled={loading}
                activeOpacity={0.8}>
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
                    Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.content}>
              {!verificationId ? (
                <>
                  <View style={styles.inputGroup}>
                    <ThemedText style={[styles.label, { color: colors.foreground }]}>
                      Phone Number
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.input,
                          color: colors.foreground,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder="8097996263"
                      placeholderTextColor={colors.mutedForeground}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.8}>
                    {loading ? (
                      <ActivityIndicator color={colors.primaryForeground} size="small" />
                    ) : (
                      <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
                        Send OTP
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.otpSection}>
                    <ThemedText style={[styles.label, { color: colors.foreground }]}>
                      Enter OTP
                    </ThemedText>
                    <ThemedText
                      style={[styles.otpHint, { color: colors.mutedForeground }]}>
                      Check your SMS for the verification code
                    </ThemedText>
                  </View>

                  <View style={styles.otpInputGroup}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          if (ref) {
                            otpRefs.current[index] = ref;
                          }
                        }}
                        style={[
                          styles.otpInput,
                          {
                            backgroundColor: colors.input,
                            color: colors.foreground,
                            borderColor: digit ? colors.primary : colors.border,
                          },
                        ]}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={({ nativeEvent }) =>
                          handleOtpKeyPress(nativeEvent.key, index)
                        }
                        keyboardType="number-pad"
                        maxLength={1}
                        editable={!loading}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    activeOpacity={0.8}>
                    {loading ? (
                      <ActivityIndicator color={colors.primaryForeground} size="small" />
                    ) : (
                      <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
                        Verify OTP
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: colors.mutedForeground }]}>
              Don't have an account?{' '}
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  header: {
    marginTop: 100,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    borderRadius: Radius.lg,
    padding: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tabNavigation: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 4,
    borderRadius: Radius.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
  },
  content: {
    gap: 20,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  input: {
    height: 52,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
  },
  otpSection: {
    marginBottom: 8,
  },
  otpHint: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '400',
  },
  otpInputGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    borderWidth: 1.5,
  },
  submitButton: {
    height: 54,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
