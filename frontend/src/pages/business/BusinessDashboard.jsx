import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/BusinessLayout';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, ShoppingCart, Package, ArrowRight, CheckCircle2, AlertCircle, ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function BusinessDashboard() {
  const { mongoUser, businessProfile, setBusinessProfile } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  // Aadhaar verification gate — farmer must be verified to access business dashboard
  // To bypass for testing: set mongoUser.isAadhaarVerified = true in localStorage
  if (mongoUser && mongoUser.isAadhaarVerified === false && !mongoUser.skipAadhaarGate) {
    return (
      <BusinessLayout loading={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldX className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Aadhaar Verification Required</CardTitle>
              <CardDescription>
                You must verify your Aadhaar with AgriStack before accessing the Business Dashboard.
                Only registered farmers can use business features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/aadhaar-verify')} className="w-full">
                Verify Aadhaar Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </BusinessLayout>
    );
  }

  useEffect(() => {
    if (mongoUser) fetchDashboard();
  }, [mongoUser]);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/business/dashboard/${mongoUser._id}`);
      setDashboard(res.data);
      if (res.data.profile) {
        setBusinessProfile(res.data.profile);
      }
    } catch (err) {
      // If no business profile, redirect to verification
      if (err.response?.status === 404) {
        navigate('/business/verify');
        return;
      }
      console.error('Error fetching business dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!businessProfile && !loading) {
    navigate('/business/verify');
    return null;
  }

  const stats = dashboard?.stats || {};

  return (
    <BusinessLayout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Business Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {businessProfile?.tradeName || 'Your Business'}
              {businessProfile?.gstNumber && (
                <span className="ml-2 text-xs">
                  <Badge variant="outline" className="text-xs">GST: {businessProfile.gstNumber}</Badge>
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {businessProfile?.verified && (
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> GST Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-green-500/10 p-3 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Wallet Balance</p>
                <p className="text-2xl font-semibold tracking-tight">₹{(stats.walletBalance || 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Earnings</p>
                <p className="text-2xl font-semibold tracking-tight">₹{(stats.totalEarnings || 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-orange-500/10 p-3 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Purchases</p>
                <p className="text-2xl font-semibold tracking-tight">₹{(stats.totalPurchases || 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Transactions</p>
                <p className="text-2xl font-semibold tracking-tight">{stats.totalTransactions || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Profile Card */}
        {businessProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Profile</CardTitle>
              <CardDescription>Your GST-verified business information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Trade Name</p>
                  <p className="font-medium">{businessProfile.tradeName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Legal Name</p>
                  <p className="font-medium">{businessProfile.legalName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Business Type</p>
                  <p className="font-medium">{businessProfile.businessType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Registration Date</p>
                  <p className="font-medium">{businessProfile.registrationDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Address</p>
                  <p className="font-medium">
                    {[businessProfile.address?.building, businessProfile.address?.street, businessProfile.address?.locality, businessProfile.address?.district, businessProfile.address?.state, businessProfile.address?.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">GST Status</p>
                  <Badge variant={businessProfile.gstStatus === 'Active' ? 'default' : 'destructive'}>
                    {businessProfile.gstStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/business/marketplace')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Browse Marketplace</h3>
                <p className="text-sm text-muted-foreground">Buy animals & equipment</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/business/orders')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">My Orders</h3>
                <p className="text-sm text-muted-foreground">Track your purchases</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/business/reports')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">View Reports</h3>
                <p className="text-sm text-muted-foreground">Analytics & insights</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Purchases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.recentPurchases?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recentPurchases.slice(0, 5).map((tx) => (
                    <div key={tx._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{tx.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">₹{tx.amount?.toLocaleString()}</p>
                        <Badge variant="outline" className="text-xs">
                          {tx.status === 'released_to_seller' ? 'Complete' : tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No purchases yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.recentSales?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recentSales.slice(0, 5).map((tx) => (
                    <div key={tx._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{tx.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          Buyer: {tx.buyerName} | {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-green-600">+₹{tx.amount?.toLocaleString()}</p>
                        <Badge variant="outline" className="text-xs">
                          {tx.status === 'released_to_seller' ? 'Credited' : tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No sales yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
}
