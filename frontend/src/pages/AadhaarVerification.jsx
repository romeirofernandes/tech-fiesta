import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BusinessLayout } from '@/components/BusinessLayout';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2, Shield, Fingerprint, XCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function AadhaarVerification() {
  const { mongoUser, setMongoUser } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const isBusinessRoute = location.pathname.startsWith('/business');
  const PageLayout = isBusinessRoute ? BusinessLayout : Layout;
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');

  const isValidAadhaar = (aadhaar) => {
    return /^\d{12}$/.test(aadhaar.replace(/\s/g, ''));
  };

  const formatAadhaar = (value) => {
    // Format as XXXX XXXX XXXX
    const digits = value.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleVerify = async () => {
    setError('');
    setVerificationResult(null);

    const cleanAadhaar = aadhaarNumber.replace(/\s/g, '');
    if (!cleanAadhaar) {
      setError('Please enter your Aadhaar number');
      return;
    }
    if (!isValidAadhaar(cleanAadhaar)) {
      setError('Invalid Aadhaar number. It must be exactly 12 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/farmer-verify/aadhaar`, {
        farmerId: mongoUser._id,
        aadhaarNumber: cleanAadhaar
      });

      if (res.data.error === false) {
        setVerificationResult(res.data.data);
        // Update mongoUser with verified status
        const isVerified = res.data.data.isVerified;
        setMongoUser(prev => ({
          ...prev,
          isAadhaarVerified: isVerified,
          aadhaarVerifiedAt: res.data.data.farmer?.aadhaarVerifiedAt
        }));
        if (isVerified) {
          toast.success('Aadhaar verified successfully!');
          // If on business route, redirect to business dashboard after short delay
          if (isBusinessRoute) {
            setTimeout(() => navigate('/business'), 2000);
          }
        } else {
          toast.error('You are not registered as a farmer in AgriStack.');
        }
      } else {
        setError(res.data.message || 'Verification failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Aadhaar verification failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyVerified = mongoUser?.isAadhaarVerified;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <Fingerprint className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Aadhaar Verification</h1>
          <p className="text-muted-foreground">
            Verify your Aadhaar number to complete your farmer profile verification
          </p>
        </div>

        {/* Already Verified */}
        {isAlreadyVerified && (
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardContent className="p-6 flex items-center gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">Aadhaar Verified</h3>
                <p className="text-sm text-muted-foreground">
                  Your Aadhaar has been successfully verified. You're all set!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Aadhaar Number Verification
            </CardTitle>
            <CardDescription>
              Enter your 12-digit Aadhaar number to verify your identity against the farmer registry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aadhaar">Aadhaar Number</Label>
              <div className="flex gap-2">
                <Input
                  id="aadhaar"
                  placeholder="e.g., 2146 3394 7046"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(formatAadhaar(e.target.value))}
                  maxLength={14} // 12 digits + 2 spaces
                  className="font-mono text-lg tracking-wider"
                  disabled={loading}
                />
                <Button onClick={handleVerify} disabled={loading || !aadhaarNumber.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                12-digit Aadhaar number issued by UIDAI
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Result — Success */}
        {verificationResult && verificationResult.isVerified && (
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Verification Successful
              </CardTitle>
              <CardDescription>Your Aadhaar has been verified against the farmer registry.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Registration Status</p>
                  <Badge className="bg-green-500/10 text-green-600 border-green-200">
                    {verificationResult.registrationStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Central ID</p>
                  <p className="font-medium">{verificationResult.centralId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Farmer Name</p>
                  <p className="font-medium">{mongoUser?.fullName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Aadhaar Verified</p>
                  <Badge className="bg-green-500/10 text-green-600 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                </div>
              </div>
              {isBusinessRoute && (
                <p className="text-sm text-muted-foreground mt-2">Redirecting to your Business Dashboard...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Result — Not Registered */}
        {verificationResult && !verificationResult.isVerified && (
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                Not Registered
              </CardTitle>
              <CardDescription>
                Your Aadhaar was found but you are not registered as a farmer in the AgriStack registry.
                You cannot access the Business Dashboard without a valid farmer registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Registration Status</p>
                  <Badge className="bg-red-500/10 text-red-600 border-red-200">
                    {verificationResult.registrationStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Central ID</p>
                  <p className="font-medium">{verificationResult.centralId || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Why verify your Aadhaar?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verify your identity as a registered farmer</li>
              <li>Access government schemes and benefits</li>
              <li>Complete your profile for trusted transactions</li>
              <li>Required for full platform features</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
