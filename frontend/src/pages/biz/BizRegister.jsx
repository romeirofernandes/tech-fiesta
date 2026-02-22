import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUser } from '@/context/UserContext';
import { Building2, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function BizRegister() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setBizOwner } = useUser();

  const isValidGST = (gst) => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase().trim());
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const cleanGST = gstNumber.toUpperCase().trim();
    if (!cleanGST) {
      setError('GST number is required');
      return;
    }
    if (!isValidGST(cleanGST)) {
      setError('Invalid GST number format. It should be 15 characters (e.g., 03DOXPM4071K1ZE)');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/biz-auth/register`, {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        gstNumber: cleanGST,
        phoneNumber: phoneNumber.trim() || undefined
      });

      if (res.data.error === false) {
        localStorage.setItem('bizToken', res.data.token);
        setBizOwner(res.data.owner);
        toast.success('Business account created successfully!');
        navigate('/biz/dashboard');
      } else {
        setError(res.data.message || 'Registration failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-primary/10 p-3 rounded-full">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Business Account</CardTitle>
          <CardDescription>
            Register your business on पशु पहचान. GST verification is required during registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="fullName"
                placeholder="e.g., Rajesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">Must match the name on your GST registration</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="business@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., 8097996263"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                GST Number (GSTIN) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gst"
                placeholder="e.g., 03DOXPM4071K1ZE"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                maxLength={15}
                className="font-mono text-lg tracking-wider"
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Your GST number will be verified during registration. Your name must match the GST records.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying GST & Creating Account...</>
              ) : (
                'Create Business Account'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Already have a business account?{' '}
            <Link to="/biz/login" className="text-primary hover:underline">Sign In</Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Are you a farmer?{' '}
            <Link to="/register" className="text-primary hover:underline">Farmer Registration</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
