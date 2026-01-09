import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Heart,
  Search,
  MapPin,
  Users,
  LayoutGrid
} from "lucide-react";
import axios from "axios";

export default function HealthAnalytics() {
  const [healthData, setHealthData] = useState({
    snapshots: [],
    animals: [],
    loading: true
  });

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const [snapshotsRes, animalsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/health-snapshots`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/animals`)
      ]);

      setHealthData({
        snapshots: snapshotsRes.data || [],
        animals: animalsRes.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
      setHealthData(prev => ({ ...prev, loading: false }));
    }
  };

  if (healthData.loading) return <div className="text-center py-20 text-muted-foreground">Loading analytics...</div>;

  const { snapshots, animals } = healthData;

  const calculateMetrics = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const weekSnapshots = snapshots.filter(s => new Date(s.calculatedOn) > oneWeekAgo);
    const criticalCases = weekSnapshots.filter(s => s.score < 50);
    
    const currentAvg = weekSnapshots.length > 0
      ? Math.round(weekSnapshots.reduce((sum, s) => sum + s.score, 0) / weekSnapshots.length)
      : 0;

    const animalsWithRecentCheck = new Set(weekSnapshots.map(s => s.animalId?._id || s.animalId));

    return {
      currentAvg,
      criticalCount: criticalCases.length,
      totalAnimals: animals.length,
      speciesCount: new Set(animals.map(a => a.species)).size,
      coverageRate: animals.length > 0 ? Math.round((animalsWithRecentCheck.size / animals.length) * 100) : 0
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      
      {/* Top Metric Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "HEALTH SCORE", val: `${metrics.currentAvg}%`, icon: Heart, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "ANIMALS", val: metrics.totalAnimals, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "CRITICAL", val: metrics.criticalCount, icon: AlertTriangle, color: "text-chart-5", bg: "bg-chart-5/10" },
          { label: "SPECIES", val: metrics.speciesCount, icon: LayoutGrid, color: "text-chart-3", bg: "bg-chart-3/10" },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className={`${item.bg} p-3 rounded-lg`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search/Filter Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Search health records..." 
            className="w-full bg-background border border-border rounded-md py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
            <button className="bg-card border border-border px-4 py-2 rounded-md text-xs font-medium hover:bg-accent transition-colors">Critical</button>
            <button className="bg-card border border-border px-4 py-2 rounded-md text-xs font-medium hover:bg-accent transition-colors">Healthy</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Farm Performance Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Health Performance by Farm</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border bg-muted">
                <th className="px-6 py-3 font-medium uppercase text-[10px]">Farm Name</th>
                <th className="px-6 py-3 font-medium uppercase text-[10px]">Avg Score</th>
                <th className="px-6 py-3 font-medium uppercase text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Note: Map your real farmHealthData here */}
              <tr className="hover:bg-accent transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">BigRom's Farm #1</td>
                <td className="px-6 py-4 font-mono text-muted-foreground">88%</td>
                <td className="px-6 py-4"><Badge className="bg-primary/10 text-primary border-none">Healthy</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sidebar: Distribution and Analytics */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Species Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">Cattle</span>
                    <span className="text-muted-foreground">82%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-chart-2" style={{width: '82%'}} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">Poultry</span>
                    <span className="text-muted-foreground">45%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive" style={{width: '45%'}} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Item */}
          {metrics.criticalCount > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">{metrics.criticalCount} Critical Alerts</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Immediate veterinary intervention required for animals with scores below 50%.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}