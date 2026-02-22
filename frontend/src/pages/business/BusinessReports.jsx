import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  ArrowRight,
  Loader2,
  PawPrint,
  Coins,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import axios from "axios";
import { formatINR, PRODUCT_LABELS, SPECIES_PRODUCT_MAP, SELLABLE_SPECIES } from "@/utils/biHelpers";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#8b5cf6", "#0d9488"];

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = "text-primary" }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center text-xs mt-1 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {Math.abs(trend)}% vs previous period
        </div>
      )}
    </CardContent>
  </Card>
);

export default function BusinessReports() {
  const navigate = useNavigate();
  const { mongoUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [underperformers, setUnderperformers] = useState([]);
  const [insights, setInsights] = useState(() => {
    try {
      const saved = localStorage.getItem('bi_insights');
      return saved ? JSON.parse(saved).insights || [] : [];
    } catch { return []; }
  });
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsUpdatedAt, setInsightsUpdatedAt] = useState(() => {
    try {
      const saved = localStorage.getItem('bi_insights');
      return saved ? JSON.parse(saved).updatedAt || null : null;
    } catch { return null; }
  });

  // Date range: last 30 days
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split("T")[0];
  const toStr = now.toISOString().split("T")[0];

  useEffect(() => {
    if (mongoUser) {
      fetchFarms();
    }
  }, [mongoUser]);

  useEffect(() => {
    if (selectedFarm) {
      fetchAll();
    }
  }, [selectedFarm]);

  const fetchFarms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/farms`, { params: { farmerId: mongoUser._id } });
      setFarms(res.data);
      if (res.data.length > 0) {
        const userFarmIds = mongoUser?.farms?.map(f => f._id || f) || [];
        const defaultFarm = userFarmIds.length > 0 ? userFarmIds[0] : res.data[0]._id;
        setSelectedFarm(defaultFarm);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch farms:", err);
      setLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, tsRes, perfRes] = await Promise.all([
        axios.get(`${API_BASE}/api/bi/farm-summary`, { params: { farmId: selectedFarm, from: fromStr, to: toStr } }),
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: "revenue", granularity: "day" } }),
        axios.get(`${API_BASE}/api/bi/animal-performance`, { params: { farmId: selectedFarm, from: fromStr, to: toStr } }),
      ]);
      setSummary(summaryRes.data);
      setTimeseries(tsRes.data.data || []);
      setUnderperformers((perfRes.data.animals || []).filter(a => a.underperforming));
    } catch (err) {
      console.error("Failed to fetch BI data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/bi/insights`, {
        params: { farmId: selectedFarm, from: fromStr, to: toStr },
      });
      const newInsights = res.data.insights || [];
      const now = new Date().toISOString();
      setInsights(newInsights);
      setInsightsUpdatedAt(now);
      localStorage.setItem('bi_insights', JSON.stringify({ insights: newInsights, updatedAt: now, farmId: selectedFarm }));
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const totals = summary?.totals || { totalRevenue: 0, totalCost: 0, profit: 0 };
  const animalCount = summary?.animalCount || 0;
  const animalsBySpecies = (summary?.animalsBySpecies || []).map(s => ({
    name: s._id ? s._id.charAt(0).toUpperCase() + s._id.slice(1) : 'Unknown',
    value: s.count,
  }));
  const animals = summary?.animals || [];
  const productionData = (summary?.production || []).map(p => ({
    name: PRODUCT_LABELS[p._id] || p._id,
    value: p.totalQuantity,
  }));
  const expenseData = (summary?.expenses || []).map(e => ({
    name: e._id.charAt(0).toUpperCase() + e._id.slice(1),
    value: e.totalCost,
  }));

  return (
    <BusinessLayout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Business Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">Farm profitability and production overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedFarm} onValueChange={setSelectedFarm}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Select Farm" />
              </SelectTrigger>
              <SelectContent>
                {farms.map(f => (
                  <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Animals"
            value={animalCount}
            subtitle={animalsBySpecies.map(s => `${s.value} ${s.name}`).join(', ') || 'No animals'}
            icon={PawPrint}
            color="text-blue-600"
          />
          <StatCard
            title="Total Revenue"
            value={formatINR(totals.totalRevenue, { compact: true })}
            subtitle="Last 30 days"
            icon={DollarSign}
            color="text-green-600"
          />
          <StatCard
            title="Total Expenses"
            value={formatINR(totals.totalCost, { compact: true })}
            subtitle="Last 30 days"
            icon={TrendingDown}
            color="text-red-500"
          />
          <StatCard
            title="Net Profit"
            value={formatINR(totals.profit, { compact: true })}
            subtitle={totals.profit >= 0 ? "Profitable" : "Loss"}
            icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
            color={totals.profit >= 0 ? "text-green-600" : "text-red-600"}
          />
          <StatCard
            title="Underperformers"
            value={underperformers.length}
            subtitle="Animals below 80% median"
            icon={AlertTriangle}
            color={underperformers.length > 0 ? "text-amber-500" : "text-green-600"}
          />
        </div>

        {/* Ways to Make Money */}
        {animalsBySpecies.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Ways to Make Money
              </CardTitle>
              <CardDescription>
                Income opportunities based on the animals currently on your farm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {animalsBySpecies.map(({ name }) => {
                  const speciesKey = name.toLowerCase();
                  const products = SPECIES_PRODUCT_MAP[speciesKey] || [];
                  const canSellLive = SELLABLE_SPECIES.includes(speciesKey);
                  if (products.length === 0 && !canSellLive) return null;
                  return (
                    <div key={speciesKey} className="p-3 rounded-lg border bg-muted/30">
                      <p className="font-semibold text-sm capitalize mb-1.5">{name}</p>
                      <ul className="space-y-1">
                        {products.map(p => (
                          <li key={p} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                            Sell {PRODUCT_LABELS[p]}
                          </li>
                        ))}
                        {canSellLive && (
                          <li className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                            Sell Live Animal
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Revenue Timeseries */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
              <CardDescription>Daily revenue (INR)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeseries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatINR(v, { compact: true, decimals: 0 })} />
                    <Tooltip formatter={(v) => [formatINR(v), "Revenue"]} />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Animals by Species */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Animals by Species</CardTitle>
              <CardDescription>{animalCount} animal{animalCount !== 1 ? 's' : ''} on farm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {animalsBySpecies.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={animalsBySpecies} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {animalsBySpecies.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No animals registered yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Breakdown + Underperformers */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Expense Breakdown</CardTitle>
              <CardDescription>By category (INR)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {expenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatINR(v, { compact: true, decimals: 0 })} />
                      <Tooltip formatter={(v) => [formatINR(v), "Cost"]} />
                      <Bar dataKey="value" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No expense data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Underperformers */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Underperforming Animals</CardTitle>
                  <CardDescription>&lt;80% of species median production</CardDescription>
                </div>
                <Badge variant={underperformers.length > 0 ? "destructive" : "secondary"}>
                  {underperformers.length} flagged
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {underperformers.length > 0 ? (
                <div className="space-y-3 max-h-52 overflow-y-auto">
                  {underperformers.map((a, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{a.animalName}</p>
                        <p className="text-xs text-muted-foreground">{a.species} • {PRODUCT_LABELS[a.productType]}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">{(a.ratio * 100).toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">{a.totalQuantity} {a.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  All animals performing within normal range
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Animal List */}
        {animals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Registered Animals</CardTitle>
              <CardDescription>{animals.length} animal{animals.length !== 1 ? 's' : ''} on this farm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Species</th>
                      <th className="pb-2 font-medium">Breed</th>
                      <th className="pb-2 font-medium">Gender</th>
                      <th className="pb-2 font-medium">Age</th>
                      <th className="pb-2 font-medium">RFID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {animals.map((a, i) => (
                      <tr key={a._id || i} className="border-b last:border-0">
                        <td className="py-2 font-medium">{a.name}</td>
                        <td className="py-2 capitalize">{a.species}</td>
                        <td className="py-2">{a.breed || '—'}</td>
                        <td className="py-2 capitalize">{a.gender || '—'}</td>
                        <td className="py-2">{a.age ? `${a.age} ${a.ageUnit || ''}` : '—'}</td>
                        <td className="py-2 font-mono text-xs">{a.rfid || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Insights */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  AI-Powered Insights
                </CardTitle>
                <CardDescription>
                  Business intelligence powered by Groq LLM
                  {insightsUpdatedAt && (
                    <span className="ml-2 text-xs">
                      — Last updated: {new Date(insightsUpdatedAt).toLocaleString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button onClick={fetchInsights} disabled={insightsLoading || !selectedFarm} variant="outline" size="sm">
                {insightsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lightbulb className="h-4 w-4 mr-2" />}
                Generate Insights
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {insights.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.map((ins, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30">
                    <p className="font-medium text-sm">{ins.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ins.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Generate Insights" to get AI analysis of your farm data.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/business/reports/finance")}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-medium">Finance Tracking</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/business/reports/prices")}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Market Prices</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
}
