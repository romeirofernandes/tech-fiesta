import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setMongoUser } = useUser();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  };

  const normalizePhone = (input) => {
    if (!input) return input;
    const trimmed = String(input).trim();
    if (trimmed.startsWith('+')) return trimmed;

    // Keep only digits
    const digits = trimmed.replace(/\D/g, '');

    // If user entered 10-digit number, assume India and prefix +91
    if (/^\d{10}$/.test(digits)) return `+91${digits}`;

    // If user entered 0XXXXXXXXXX (11 digits), drop leading 0 and prefix +91
    if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;

    // If user entered 91XXXXXXXXXX (12 digits), add leading +
    if (/^91\d{10}$/.test(digits)) return `+${digits}`;

    // Fallback: return digits with + if it seems like an international number
    return digits.length ? `+${digits}` : input;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await syncWithBackend(user.uid);
    } catch (error) {
      console.error(error);
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    const formattedPhone = normalizePhone(phone);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setVerificationId(confirmationResult);
      toast.success("OTP sent successfully!");
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await verificationId.confirm(otp);
      const user = result.user;
      await syncWithBackend(user.uid);
    } catch (error) {
      console.error(error);
      toast.error("Invalid OTP");
      setLoading(false);
    }
  };

  const syncWithBackend = async (firebaseUid) => {
    try {
      // if user signed in with phone field, ensure we pass normalized phone to backend
      const currentPhone = normalizePhone(phone);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farmers/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firebaseUid, phoneNumber: currentPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        setMongoUser(data);
        toast.success("Login successful!");
        navigate('/dashboard');
      } else {
        if (response.status === 404) {
            toast.error("Account not found. Please register first.");
        } else {
            toast.error(data.message || "Backend sync failed");
        }
        await auth.signOut();
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error connecting to backend");
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Welcome back to पशु पहचान</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="phone">
                {!verificationId ? (
                  <form onSubmit={handleSendOtp} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="e.g. 8097996263" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                    <div id="recaptcha-container-login"></div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                            <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign Up</Link>
          </p>
          <Link 
            to="/admin/login" 
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            <Shield className="h-4 w-4 text-primary" />
            <span className="  text-sm text-primary">Admin Login</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;