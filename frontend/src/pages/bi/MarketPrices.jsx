import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Store, IndianRupee } from "lucide-react";
import axios from "axios";
import { formatINR, MARKET_COMMODITY_LABELS, MARKET_COMMODITIES } from "@/utils/biHelpers";
import { format } from "date-fns";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function MarketPrices() {
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState("cow");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchPrices();
  }, [selectedCommodity]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/market-prices`, {
        params: { commodity: selectedCommodity, limit: 200 },
      });
      const data = res.data || [];
      setPrices(data);

      // Build chart data (sorted by date ascending)
      const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
      setChartData(
        sorted.map(p => ({
          date: format(new Date(p.date), "dd MMM"),
          modalPrice: p.modalPrice,
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          market: p.market,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch market prices:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compute summary stats
  const latestPrice = prices.length > 0 ? prices[0] : null;
  const avgModal = prices.length > 0
    ? Math.round(prices.reduce((s, p) => s + p.modalPrice, 0) / prices.length)
    : 0;
  const maxModal = prices.length > 0
    ? Math.max(...prices.map(p => p.modalPrice))
    : 0;
  const minModal = prices.length > 0
    ? Math.min(...prices.map(p => p.modalPrice))
    : 0;

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Market Prices</h1>
            <p className="text-muted-foreground text-sm mt-1">India commodity prices from AGMARKNET & manual entries</p>
          </div>
          <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
            <SelectTrigger className="w-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKET_COMMODITIES.map(p => (
                <SelectItem key={p} value={p}>{MARKET_COMMODITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Latest Modal Price</CardTitle>
              <IndianRupee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestPrice ? `₹${latestPrice.modalPrice}` : "—"}
              </div>
              {latestPrice && (
                <p className="text-xs text-muted-foreground mt-1">
                  {latestPrice.unit} • {latestPrice.market || "N/A"}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Price</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{avgModal}</div>
              <p className="text-xs text-muted-foreground mt-1">Across {prices.length} records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Price Range</CardTitle>
              <Store className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{minModal} – ₹{maxModal}</div>
              <p className="text-xs text-muted-foreground mt-1">Min to Max modal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Data Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {[...new Set(prices.map(p => p.source))].map(s => (
                  <Badge key={s} variant={s === "agmarknet" ? "default" : "outline"}>
                    {s === "agmarknet" ? "AGMARKNET" : "Manual"}
                  </Badge>
                ))}
                {prices.length === 0 && <span className="text-muted-foreground text-sm">No data</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Price Trend — {MARKET_COMMODITY_LABELS[selectedCommodity]}</CardTitle>
            <CardDescription>Modal, min & max prices over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v) => [`₹${v}`]} />
                    <Legend />
                    <Line type="monotone" dataKey="modalPrice" stroke="#2563eb" strokeWidth={2} dot={false} name="Modal Price" />
                    <Line type="monotone" dataKey="minPrice" stroke="#16a34a" strokeWidth={1} dot={false} strokeDasharray="5 5" name="Min Price" />
                    <Line type="monotone" dataKey="maxPrice" stroke="#ea580c" strokeWidth={1} dot={false} strokeDasharray="5 5" name="Max Price" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No price data available for {MARKET_COMMODITY_LABELS[selectedCommodity]}. Ask your admin to import from AGMARKNET or add manually.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Prices Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Prices</CardTitle>
          </CardHeader>
          <CardContent>
            {prices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Market</th>
                      <th className="pb-2 font-medium">State</th>
                      <th className="pb-2 font-medium text-right">Modal (₹)</th>
                      <th className="pb-2 font-medium text-right">Min (₹)</th>
                      <th className="pb-2 font-medium text-right">Max (₹)</th>
                      <th className="pb-2 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.slice(0, 50).map(p => (
                      <tr key={p._id} className="border-b last:border-0">
                        <td className="py-2">{format(new Date(p.date), "dd MMM yyyy")}</td>
                        <td className="py-2">{p.market || "—"}</td>
                        <td className="py-2">{p.state || "—"}</td>
                        <td className="py-2 text-right font-medium">{p.modalPrice}</td>
                        <td className="py-2 text-right">{p.minPrice ?? "—"}</td>
                        <td className="py-2 text-right">{p.maxPrice ?? "—"}</td>
                        <td className="py-2 text-xs text-muted-foreground">{p.unit}</td>
                        <td className="py-2">
                          <Badge variant={p.source === "agmarknet" ? "default" : "outline"} className="text-xs">
                            {p.source === "agmarknet" ? "AGMARKNET" : "Manual"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No market price data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
