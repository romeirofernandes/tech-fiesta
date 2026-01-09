import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, AlertCircle, Heart } from "lucide-react";
import FarmDistributionMap from "./FarmDistributionMap";
import axios from "axios";

export default function OverviewStats() {
  const [stats, setStats] = useState({
    farms: 0,
    animals: 0,
    activeAlerts: 0,
    avgHealthScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [farms, animals, alerts, healthSnapshots] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/farms`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/animals`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/alerts`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/health-snapshots`)
      ]);

      const activeAlerts = alerts.data?.filter(a => !a.isResolved).length || 0;
      const avgHealthScore = healthSnapshots.data?.length > 0
        ? Math.round(healthSnapshots.data.reduce((sum, snap) => sum + (snap.score || 0), 0) / healthSnapshots.data.length)
        : 0;

      setStats({
        farms: farms.data?.length || 0,
        animals: animals.data?.length || 0,
        activeAlerts,
        avgHealthScore
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Stats fetch error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-12 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Farms</p>
              <p className="text-2xl font-bold">{stats.farms}</p>
            </div>
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Animals</p>
              <p className="text-2xl font-bold">{stats.animals}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="text-2xl font-bold">{stats.activeAlerts}</p>
              <p className="text-xs text-red-600 mt-1">Requires attention</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Avg Health Score</p>
              <p className="text-2xl font-bold">{stats.avgHealthScore}%</p>
              <p className="text-xs text-blue-600 mt-1">Overall health</p>
            </div>
            <Heart className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Farm Distribution Map */}
      <FarmDistributionMap />
    </div>
  );
}