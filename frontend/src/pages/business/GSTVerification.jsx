import { useState } from 'react';
import { BusinessLayout } from '@/components/BusinessLayout';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2, Building2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function GSTVerification() {
  const { mongoUser, setBusinessProfile } = useUser();
  const navigate = useNavigate();
  const [gstNumber, setGstNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');

  const isValidGST = (gst) => {
    // Indian GST format: 2 digits state code + 10 char PAN + 1 entity number + 1 Z + 1 check digit
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase().trim());
  };

  const handleVerify = async () => {
    setError('');
    setVerificationResult(null);

    const cleanGST = gstNumber.toUpperCase().trim();
    if (!cleanGST) {
      setError('Please enter a GST number');
      return;
    }
    if (!isValidGST(cleanGST)) {
      setError('Invalid GST number format. It should be 15 characters (e.g., 03DOXPM4071K1ZE)');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/business/verify-gst`, {
        farmerId: mongoUser._id,
        gstNumber: cleanGST,
        ownerName: ownerName.trim() || mongoUser.fullName
      });

      if (res.data.error === false) {
        setVerificationResult(res.data.profile);
        setBusinessProfile(res.data.profile);
        toast.success('GST verified successfully!');
      } else {
        setError(res.data.message || 'Verification failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'GST verification failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BusinessLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Business Verification</h1>
          <p className="text-muted-foreground">
            Verify your GST number to access the business dashboard and marketplace
          </p>
        </div>

        {/* Verification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              GST Number Verification
            </CardTitle>
            <CardDescription>
              Enter your 15-digit GST Identification Number (GSTIN) to verify your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Business Owner Name</Label>
              <Input
                id="ownerName"
                placeholder="e.g., Rajesh Kumar"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="text-lg"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Must match the name on your GST registration
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst">GST Number (GSTIN)</Label>
              <div className="flex gap-2">
                <Input
                  id="gst"
                  placeholder="e.g., 03DOXPM4071K1ZE"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  maxLength={15}
                  className="font-mono text-lg tracking-wider"
                  disabled={loading}
                />
                <Button onClick={handleVerify} disabled={loading || !gstNumber.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: 2 digits (state) + PAN + entity code + Z + check digit
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

        {/* Verification Result */}
        {verificationResult && (
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Verification Successful
              </CardTitle>
              <CardDescription>Your business has been verified. You can now access the full business dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Trade Name</p>
                  <p className="font-medium">{verificationResult.tradeName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Legal Name</p>
                  <p className="font-medium">{verificationResult.legalName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Business Type</p>
                  <p className="font-medium">{verificationResult.businessType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">GST Status</p>
                  <Badge className="bg-green-500/10 text-green-600 border-green-200">
                    {verificationResult.gstStatus}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Address</p>
                  <p className="font-medium">
                    {[verificationResult.address?.building, verificationResult.address?.street, verificationResult.address?.locality, verificationResult.address?.district, verificationResult.address?.state, verificationResult.address?.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={() => navigate('/business')}>
                Go to Business Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Why verify your GST?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Access the business marketplace to buy & sell animals</li>
              <li>Direct payments credited to your business wallet</li>
              <li>Full business analytics and reporting</li>
              <li>Verified badge for buyer trust</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </BusinessLayout>
  );
}
