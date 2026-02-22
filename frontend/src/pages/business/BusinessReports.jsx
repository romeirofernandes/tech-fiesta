import { BusinessLayout } from '@/components/BusinessLayout';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, ArrowRight, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const COLORS = ['#16a34a', '#2563eb', '#ea580c', '#7c3aed', '#dc2626', '#0891b2'];

export default function BusinessReports() {
  const { mongoUser } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState({ revenue: [], cost: [], production: [] });

  useEffect(() => { fetchFarms(); }, []);
  useEffect(() => {
    if (selectedFarm) {
      fetchSummary();
      fetchTimeseries();
    }
  }, [selectedFarm]);

  const fetchFarms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/farms`, { params: { farmerId: mongoUser._id } });
      setFarms(res.data);
      if (res.data.length > 0) setSelectedFarm(res.data[0]._id);
      else setLoading(false);
    } catch (err) { setLoading(false); }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/bi/farm-summary`, { params: { farmId: selectedFarm } });
      setSummary(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchTimeseries = async () => {
    try {
      const [rev, cost, prod] = await Promise.all([
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: 'revenue', granularity: 'day' } }),
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: 'cost', granularity: 'day' } }),
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: 'production', granularity: 'day' } }),
      ]);
      setTimeseries({
        revenue: rev.data.data || [],
        cost: cost.data.data || [],
        production: prod.data.data || []
      });
    } catch (err) { console.error(err); }
  };

  const profit = (summary?.totalRevenue || 0) - (summary?.totalExpenses || 0);

  return (
    <BusinessLayout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Business Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">Overview of your farm business performance</p>
          </div>
          <Select value={selectedFarm} onValueChange={setSelectedFarm}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Farm" />
            </SelectTrigger>
            <SelectContent>
              {farms.map(f => <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{(summary?.totalRevenue || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">₹{(summary?.totalExpenses || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Profit</p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{profit.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Animals</p>
              <p className="text-2xl font-bold">{summary?.totalAnimals || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue & Expense Chart */}
        {(timeseries.revenue.length > 0 || timeseries.cost.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Expenses Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" data={timeseries.revenue} dataKey="value" stroke="#16a34a" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" data={timeseries.cost} dataKey="value" stroke="#dc2626" name="Expenses" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/business/reports/finance')}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Finance Tracking</h3>
                <p className="text-xs text-muted-foreground">Sales & expenses</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/business/reports/prices')}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Market Prices</h3>
                <p className="text-xs text-muted-foreground">Today's commodity prices</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
}
