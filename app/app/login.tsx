import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text as RNText,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import {
  signInWithEmailAndPassword,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useUser } from '@/context/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Lock, ArrowRight, Check } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

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
        // Alert.alert('Success', 'Login successful!'); // Optional: removed for smoother UX
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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8 items-center">
            <Text className="text-3xl font-bold text-primary font-serif mb-2">पशु पहचान</Text>
            <Text className="text-muted-foreground text-center">
              Welcome back to your livestock hub
            </Text>
          </View>

          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="items-center pb-2">
              <CardTitle>Sign in to your account</CardTitle>
              <CardDescription>
                Choose your preferred login method
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tab Navigation */}
              <View className="flex-row bg-muted/50 p-1 rounded-lg mb-6">
                <Pressable
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: activeTab === 'email' ? colors.background : 'transparent',
                    shadowColor: activeTab === 'email' ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: activeTab === 'email' ? 0.05 : 0,
                    shadowRadius: 2,
                    elevation: activeTab === 'email' ? 1 : 0,
                  }}
                  onPress={() => setActiveTab('email')}
                >
                  <Mail size={16} color={activeTab === 'email' ? colors.primary : colors.mutedForeground} />
                  <RNText style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'email' ? colors.text : colors.mutedForeground }}>
                    Email
                  </RNText>
                </Pressable>
                <Pressable
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: activeTab === 'phone' ? colors.background : 'transparent',
                    shadowColor: activeTab === 'phone' ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: activeTab === 'phone' ? 0.05 : 0,
                    shadowRadius: 2,
                    elevation: activeTab === 'phone' ? 1 : 0,
                  }}
                  onPress={() => setActiveTab('phone')}
                >
                  <Phone size={16} color={activeTab === 'phone' ? colors.primary : colors.mutedForeground} />
                  <RNText style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'phone' ? colors.text : colors.mutedForeground }}>
                    Phone
                  </RNText>
                </Pressable>
              </View>

              {activeTab === 'email' ? (
                <View className="gap-4">
                  <View className="gap-1.5">
                    <Label className="pl-1">Email address</Label>
                    <Input
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                  </View>

                  <View className="gap-1.5">
                    <Label className="pl-1">Password</Label>
                    <Input
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>

                  <Button 
                    onPress={handleEmailLogin} 
                    disabled={loading} 
                    className="w-full mt-2"
                    size="lg"
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text className="text-primary-foreground font-semibold mr-2">Login</Text>
                        <ArrowRight size={18} color="#fff" />
                      </>
                    )}
                  </Button>
                </View>
              ) : (
                <View className="gap-4">
                  {!verificationId ? (
                    <>
                      <View className="gap-1.5">
                        <Label className="pl-1">Phone Number</Label>
                        <Input
                          placeholder="9876543210"
                          value={phone}
                          onChangeText={setPhone}
                          keyboardType="phone-pad"
                          editable={!loading}
                          
                        />
                         <Text className="text-xs text-muted-foreground pl-1">
                          We'll send a 6-digit verification code.
                        </Text>
                      </View>

                      <Button 
                        onPress={handleSendOtp} 
                        disabled={loading} 
                        className="w-full mt-2"
                        size="lg"
                      >
                         {loading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Text className="text-primary-foreground font-semibold mr-2">Send Code</Text>
                            <ArrowRight size={18} color="#fff" />
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <View className="gap-2 items-center mb-2">
                        <Text className="text-sm text-center text-muted-foreground">
                          Enter the code sent to {phone}
                        </Text>
                      </View>

                      <View className="flex-row justify-between gap-2 mb-4">
                        {otp.map((digit, index) => (
                          <Input
                            key={index}
                            ref={(ref) => {
                              if (ref) {
                                otpRefs.current[index] = ref;
                              }
                            }}
                            className="w-12 h-12 text-center text-lg font-bold p-0"
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

                      <Button 
                        onPress={handleVerifyOtp} 
                        disabled={loading} 
                        className="w-full"
                        size="lg"
                      >
                         {loading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Text className="text-primary-foreground font-semibold mr-2">Verify</Text>
                            <Check size={18} color="#fff" />
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </View>
              )}
            </CardContent>
            
            <CardFooter className="flex-col items-center gap-4 pt-2">
              <View className="flex-row items-center w-full gap-2">
                <Separator className="flex-1" />
                <Text className="text-xs text-muted-foreground uppercase">Or</Text>
                <Separator className="flex-1" />
              </View>
              
              <View className="flex-row gap-1">
                <Text className="text-sm text-muted-foreground">Don't have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                    <Text className="text-sm font-semibold text-primary">Sign Up</Text>
                </TouchableOpacity>
              </View>
            </CardFooter>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
