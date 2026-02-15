import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Tractor,
  AlertTriangle,
  Syringe,
  Activity,
  Heart,
  Bell,
  MapPin,
  ArrowRight,
  Sprout,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Barn icon SVG for map markers
const createBarnIcon = (isDark) => {
  const color = isDark ? "#4ade80" : "#16a34a";
  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
      </filter>
      <g filter="url(#shadow)">
        <path d="M16 36 L16 36 C16 36 4 24 4 16 A12 12 0 0 1 28 16 C28 24 16 36 16 36Z" fill="${color}"/>
        <circle cx="16" cy="15" r="9" fill="${bg}"/>
        <g transform="translate(9, 8)" fill="${color}">
          <path d="M7 0 L0 5 L1 5 L1 12 L13 12 L13 5 L14 5 Z M7 2 L12 5.7 L12 11 L8.5 11 L8.5 7.5 L5.5 7.5 L5.5 11 L2 11 L2 5.7 Z"/>
        </g>
      </g>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "barn-marker-icon",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    tooltipAnchor: [0, -40],
  });
};

const SEVERITY_STYLES = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-chart-5/10 text-chart-5",
  low: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const { mongoUser } = useUser();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Data
  const [animals, setAnimals] = useState([]);
  const [farms, setFarms] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [healthSnapshots, setHealthSnapshots] = useState([]);
  const [sensorEvents, setSensorEvents] = useState([]);

  useEffect(() => {
    setMounted(true);
    if (mongoUser) {
      fetchDashboardData();
    }
  }, [mongoUser]);

  const fetchDashboardData = async () => {
    if (!mongoUser) return;
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const params = { farmerId: mongoUser._id };
      
      const [
        animalsRes,
        farmsRes,
        alertsRes,
        vaccRes,
        healthRes,
        sensorRes,
      ] = await Promise.all([
        axios.get(`${base}/api/animals`, { params }).catch(() => ({ data: [] })),
        axios.get(`${base}/api/farms`, { params }).catch(() => ({ data: [] })),
        axios.get(`${base}/api/alerts`, { params }).catch(() => ({ data: [] })),
        axios
          .get(`${base}/api/vaccination-events`, { params })
          .catch(() => ({ data: [] })),
        axios.get(`${base}/api/health-snapshots`, { params }).catch(() => ({ data: [] })),
        axios
          .get(`${base}/api/sensor-events?type=heartRate`, { params })
          .catch(() => ({ data: [] })),
      ]);

      setAnimals(Array.isArray(animalsRes.data) ? animalsRes.data : []);
      setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : []);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setVaccinations(Array.isArray(vaccRes.data) ? vaccRes.data : []);
      setHealthSnapshots(
        Array.isArray(healthRes.data) ? healthRes.data : []
      );
      setSensorEvents(Array.isArray(sensorRes.data) ? sensorRes.data : []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const activeAlerts = alerts.filter((a) => !a.isResolved);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "high");

  const vaccinationsDue = vaccinations.filter((v) => {
    if (v.eventType !== "scheduled") return false;
    const eventDate = new Date(v.date);
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return eventDate >= now && eventDate <= weekFromNow;
  });

  const vaccinationsOverdue = vaccinations.filter((v) => {
    if (v.eventType !== "scheduled") return false;
    return new Date(v.date) < new Date();
  });

  const avgHealthScore =
    healthSnapshots.length > 0
      ? Math.round(
        healthSnapshots.reduce((sum, h) => sum + (h.score || 0), 0) /
        healthSnapshots.length
      )
      : 0;

  // Species breakdown
  const speciesCount = animals.reduce((acc, a) => {
    acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {});

  // Farm markers for map
  const farmMarkers = farms
    .map((farm) => {
      if (!farm.location) return null;
      const parts = farm.location.split(",").map((c) => parseFloat(c.trim()));
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      const farmAnimals = animals.filter(
        (a) =>
          a.farmId === farm._id ||
          a.farmId?._id === farm._id
      );
      return {
        ...farm,
        lat: parts[0],
        lng: parts[1],
        animalCount: farmAnimals.length,
      };
    })
    .filter(Boolean);

  const centerLat =
    farmMarkers.length > 0
      ? farmMarkers.reduce((sum, f) => sum + f.lat, 0) / farmMarkers.length
      : 20.5937;
  const centerLng =
    farmMarkers.length > 0
      ? farmMarkers.reduce((sum, f) => sum + f.lng, 0) / farmMarkers.length
      : 78.9629;

  const isDark = theme === "dark";
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const recentAlerts = activeAlerts.slice(0, 5);

  const speciesEmojis = {
    cow: "🐄",
    buffalo: "🐃",
    goat: "🐐",
    sheep: "🐑",
    chicken: "🐔",
    pig: "🐷",
    horse: "🐴",
    other: "🐾",
  };

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your farm operations
          </p>
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/animals")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Beef className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  TOTAL ANIMALS
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {animals.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {Object.keys(speciesCount).length} species
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/farms")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-chart-1/10 p-3 rounded-lg">
                <Tractor className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  TOTAL FARMS
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {farms.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {farmMarkers.length} mapped
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/alerts")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-destructive/10 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  ACTIVE ALERTS
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {activeAlerts.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {criticalAlerts.length > 0 ? (
                      <span className="text-destructive font-bold">
                        {criticalAlerts.length} critical
                      </span>
                    ) : (
                      "No critical"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/calendar")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-chart-2/10 p-3 rounded-lg">
                <Syringe className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  VACCINATIONS DUE
                </p>
              </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow bg-primary/5 border-primary/20"
          onClick={() => navigate("/schemes")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-lg">
              <Sprout className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                GOVT SCHEMES
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  View
                </p>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                AVG HEALTH SCORE
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {avgHealthScore > 0 ? `${avgHealthScore}/100` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {healthSnapshots.length} records
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-chart-4/10 p-3 rounded-lg">
              <Activity className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                SENSOR READINGS
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {sensorEvents.length}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Heart rate events
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
              SPECIES BREAKDOWN
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(speciesCount).map(([species, count]) => (
                <Badge
                  key={species}
                  variant="outline"
                  className="text-xs capitalize gap-1"
                >
                  {speciesEmojis[species] || "🐾"} {species}: {count}
                </Badge>
              ))}
              {Object.keys(speciesCount).length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No animals yet
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Farm Map */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Farm Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] relative rounded-b-xl overflow-hidden">
              {mounted && (
                <MapContainer
                  center={[centerLat, centerLng]}
                  zoom={farmMarkers.length > 0 ? 7 : 5}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={true}
                  attributionControl={false}
                >
                  <TileLayer url={tileUrl} maxZoom={20} />

                  {farmMarkers.map((farm) => (
                    <Marker
                      key={farm._id}
                      position={[farm.lat, farm.lng]}
                      icon={createBarnIcon(isDark)}
                      eventHandlers={{
                        click: () => navigate(`/farms/${farm._id}`),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -5]}>
                        <div className="text-sm">
                          <p className="font-semibold">{farm.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {farm.animalCount} animal
                            {farm.animalCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}
                </MapContainer>
              )}
              {farmMarkers.length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
                  <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 text-center pointer-events-auto">
                    <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No farms with locations yet
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate("/farms/create")}
                      className="mt-1"
                    >
                      Add a farm
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4" />
                Recent Alerts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/alerts")}
                className="text-xs text-muted-foreground"
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No active alerts
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className={`text-[8px] uppercase font-bold border-none px-1.5 py-0 rounded-sm ${SEVERITY_STYLES[alert.severity] ||
                              SEVERITY_STYLES.low
                              }`}
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                            {alert.type}
                          </span>
                        </div>
                        <p className="text-sm text-foreground font-medium truncate">
                          {alert.animalId?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {alert.message}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(alert.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </Layout >
  );
}
