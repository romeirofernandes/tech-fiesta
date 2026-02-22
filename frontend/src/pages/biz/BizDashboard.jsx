import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/BusinessLayout';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, ShoppingCart, Package, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function BizDashboard() {
  const { bizOwner, setBizOwner } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('bizToken');
      const res = await axios.get(`${API_BASE}/api/biz-auth/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.error === false) {
        setDashboard(res.data);
        if (res.data.owner) {
          setBizOwner(res.data.owner);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('bizToken');
        setBizOwner(null);
        navigate('/biz/login');
        return;
      }
      console.error('Error fetching business dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = dashboard?.stats || {};
  const owner = bizOwner || dashboard?.owner;

  return (
    <BusinessLayout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Business Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {owner?.tradeName || owner?.fullName || 'Your Business'}
              {owner?.gstNumber && (
                <span className="ml-2 text-xs">
                  <Badge variant="outline" className="text-xs">GST: {owner.gstNumber}</Badge>
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {owner?.isGstVerified && (
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
        {owner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Profile</CardTitle>
              <CardDescription>Your GST-verified business information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Trade Name</p>
                  <p className="font-medium">{owner.tradeName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Legal Name</p>
                  <p className="font-medium">{owner.legalName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Business Type</p>
                  <p className="font-medium">{owner.businessType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Registration Date</p>
                  <p className="font-medium">{owner.registrationDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Address</p>
                  <p className="font-medium">
                    {[owner.address?.building, owner.address?.street, owner.address?.locality, owner.address?.district, owner.address?.state, owner.address?.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">GST Status</p>
                  <Badge variant={owner.gstStatus === 'Active' ? 'default' : 'destructive'}>
                    {owner.gstStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/biz/marketplace')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Browse Marketplace</h3>
                <p className="text-sm text-muted-foreground">Buy & sell animals</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/biz/orders')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">My Orders</h3>
                <p className="text-sm text-muted-foreground">Track your purchases</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/biz/sales')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">My Sales</h3>
                <p className="text-sm text-muted-foreground">Track your sales</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
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
