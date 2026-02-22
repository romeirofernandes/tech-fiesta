import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Activity,
  Thermometer,
  Droplets,
  Heart,
  Wifi,
  WifiOff,
  RefreshCw,
  Radio,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Watch,
  Cpu,
  Zap,
  CircuitBoard,
} from "lucide-react";
import { useIotPolling } from "@/hooks/useIotPolling";
import { useUser } from "@/context/UserContext";
import { format } from "date-fns";
import { toast } from "sonner";

// API Configuration - Now using Node.js backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Time range options (in minutes)
const TIME_RANGES = {
  "1h": { label: "Last 1 Hour", minutes: 60 },
  "6h": { label: "Last 6 Hours", minutes: 360 },
  "24h": { label: "Last 24 Hours", minutes: 1440 },
  "7d": { label: "Last 7 Days", minutes: 10080 },
  "all": { label: "Show All", minutes: null },
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label, timeRange }) => {
  if (active && payload && payload.length) {
    const formattedLabel = typeof label === 'number' 
      ? format(new Date(label), timeRange === '7d' || timeRange === 'all' ? 'MM/dd HH:mm:ss' : 'HH:mm:ss')
      : label;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm text-muted-foreground">{formattedLabel}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(1)} {entry.unit || ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Stat Card Component
const StatCard = ({ title, value, unit, icon: Icon, color, trend }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">
        {value !== null && value !== undefined ? value : "--"}
        <span className="text-lg font-normal text-muted-foreground ml-1">{unit}</span>
      </div>
      {trend && (
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      )}
    </CardContent>
  </Card>
);

// Chart Component
const VitalChart = ({ data, dataKey, title, color, unit, yDomain, timeRange }) => (
  <Card className="col-span-1">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>Live readings from the sensor</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="h-62.5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain || ["auto", "auto"]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip content={<CustomTooltip timeRange={timeRange} />} />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={title}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              unit={unit}
              isAnimationActive={true}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

// ─── Neckband Lifespan Estimator ────────────────────────────────────
// ESP32 + DHT11 + MAX30102 wired neckband on livestock typically lasts
// 8-14 months depending on conditions. Component-level estimates:
//   - ESP32 board:      ~3 years (durable silicon, but humidity degrades PCB)
//   - DHT11 sensor:     ~2 years (humidity sensor drift over time)
//   - MAX30102 (PPG):   ~18 months (LED degradation, animal sweat corrosion)
//   - Wiring/housing:   ~10 months (animal movement, rain, UV exposure)
//   - Battery/power:    ~8 months (rechargeable LiPo under constant use)
// Bottleneck is the physical housing + battery → overall ~10 months.

const NECKBAND_LIFESPAN_DAYS = 300; // ~10 months

const componentLifespans = [
  { name: "ESP32 Board",        icon: Cpu,          totalDays: 1095, color: "text-emerald-500",  bgColor: "bg-emerald-500" },
  { name: "DHT11 Sensor",       icon: Thermometer,  totalDays: 730,  color: "text-blue-500",    bgColor: "bg-blue-500" },
  { name: "MAX30102 (Heart)",   icon: Heart,         totalDays: 540,  color: "text-pink-500",    bgColor: "bg-pink-500" },
  { name: "Wiring & Housing",   icon: CircuitBoard,  totalDays: 300,  color: "text-orange-500",  bgColor: "bg-orange-500" },
  { name: "Battery Module",     icon: Zap,           totalDays: 240,  color: "text-yellow-500",  bgColor: "bg-yellow-500" },
];

function getLifespanStatus(daysRemaining, totalDays) {
  const pct = (daysRemaining / totalDays) * 100;
  if (pct > 60) return { label: "Good", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/30" };
  if (pct > 30) return { label: "Fair", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-950/30" };
  if (pct > 10) return { label: "Worn", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950/30" };
  return { label: "Replace Soon", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/30" };
}

const NeckbandLifespan = ({ animals }) => {
  // Use the earliest animal createdAt as the neckband install date
  const installDate = useMemo(() => {
    if (!animals || animals.length === 0) return null;
    // Find any animal that has a createdAt
    const withDates = animals.filter(a => a.createdAt);
    if (withDates.length === 0) return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // fallback: 90 days ago
    const earliest = withDates.reduce((min, a) => {
      const d = new Date(a.createdAt);
      return d < min ? d : min;
    }, new Date());
    return earliest;
  }, [animals]);

  if (!installDate) return null;

  const daysSinceInstall = Math.floor((Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24));
  const overallRemaining = Math.max(0, NECKBAND_LIFESPAN_DAYS - daysSinceInstall);
  const overallPct = Math.max(0, Math.min(100, (overallRemaining / NECKBAND_LIFESPAN_DAYS) * 100));
  const overallStatus = getLifespanStatus(overallRemaining, NECKBAND_LIFESPAN_DAYS);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Watch className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Neckband Lifespan</CardTitle>
              <CardDescription>
                Estimated wear & replacement timeline for the IoT neckband
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={`${overallStatus.bg} ${overallStatus.color} font-semibold px-3 py-1`}>
            {overallStatus.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Neckband Health</span>
            <span className={`text-sm font-bold ${overallStatus.color}`}>
              {overallRemaining > 0 ? `Replace in ~${overallRemaining} days` : "Replace now!"}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPct > 60 ? 'bg-green-500' :
                overallPct > 30 ? 'bg-yellow-500' :
                overallPct > 10 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              Installed: {format(installDate, "dd MMM yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              {daysSinceInstall} days in use
            </span>
          </div>
        </div>

        {/* Component breakdown */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {componentLifespans.map((comp) => {
            const remaining = Math.max(0, comp.totalDays - daysSinceInstall);
            const pct = Math.max(0, Math.min(100, (remaining / comp.totalDays) * 100));
            const status = getLifespanStatus(remaining, comp.totalDays);
            const CompIcon = comp.icon;

            return (
              <div key={comp.name} className={`rounded-lg border p-3 ${status.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CompIcon className={`h-4 w-4 ${comp.color}`} />
                  <span className="text-xs font-semibold truncate">{comp.name}</span>
                </div>
                <div className="h-1.5 bg-background/50 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${comp.bgColor}`}
                    style={{ width: `${pct}%`, opacity: pct > 10 ? 1 : 0.5 }}
                  />
                </div>
                <div className="text-xs font-medium">
                  {remaining > 0 ? (
                    <span className={status.color}>{remaining}d left</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-bold">Replace!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── ConnectionStatus (outside component to avoid remount on every render) ───
const ConnectionStatus = ({ status, iotStatus, lastUpdated, timeSinceData }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
    {/* Polling Status */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Server:</span>
      {status === "connected" ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
            Online
          </Badge>
        </>
      ) : status === "polling" ? (
        <>
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            Getting data...
          </Badge>
        </>
      ) : status === "error" ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
            Not working
          </Badge>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 text-yellow-500" />
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
            Starting up...
          </Badge>
        </>
      )}
    </div>

    {/* IoT Device Status */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Sensor Device:</span>
      {iotStatus === "connected" ? (
        <>
          <Radio className="h-4 w-4 text-green-500" />
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
            On
          </Badge>
        </>
      ) : iotStatus === "disconnected" ? (
        <>
          <Radio className="h-4 w-4 text-red-500" />
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
            Off
          </Badge>
        </>
      ) : (
        <>
          <Radio className="h-4 w-4 text-gray-400" />
          <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400">
            No signal
          </Badge>
        </>
      )}
    </div>

    {/* IoT Data Status */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Last Reading:</span>
      {lastUpdated ? (
        <>
          <Activity className="h-4 w-4 text-green-500" />
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
            {timeSinceData}
          </Badge>
        </>
      ) : (
        <>
          <Activity className="h-4 w-4 text-gray-400" />
          <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400">
            Waiting...
          </Badge>
        </>
      )}
    </div>
  </div>
);

export default function LiveVitals() {
  const { mongoUser } = useUser();
  // State
  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState("all");
  const [timeRange, setTimeRange] = useState(() => {
    return localStorage.getItem("liveVitalsTimeRange") || "1h";
  });
  const [timeSinceData, setTimeSinceData] = useState("");
  const [isolationAlerts, setIsolationAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Save timeRange to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem("liveVitalsTimeRange", timeRange);
  }, [timeRange]);

  // Long polling for IoT sensor data — no RFID filter, always show latest
  const { 
    data: pollingData, 
    latestReading: polledLatestReading, 
    status, 
    iotStatus,
    lastUpdated,
    refetch 
  } = useIotPolling(API_BASE, {
    pollInterval: 1000, // Poll every 1 second for snappier updates
    rfid: null,         // No filter — show all readings from the device
    farmerId: mongoUser?._id,
    limit: 500,
    enabled: !!mongoUser,
    onNewData: (newData) => {
      if (newData.length > 0) console.log(`Received ${newData.length} new readings`);
    }
  });

  // Transform polling data for charts (filter by time range)
  const historicalData = useMemo(() => {
    if (!pollingData || pollingData.length === 0) return [];
    
    return pollingData
      .filter((reading) => {
        if (timeRange === "all") return true;
        const cutoffTime = Date.now() - TIME_RANGES[timeRange].minutes * 60 * 1000;
        return new Date(reading.timestamp).getTime() > cutoffTime;
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Sort chronologically (oldest to newest)
      .map((reading) => ({
        time: format(
          new Date(reading.timestamp),
          timeRange === "7d" || timeRange === "all" ? "MM/dd HH:mm" : "HH:mm:ss"
        ),
        timestamp: new Date(reading.timestamp).getTime(),
        temperature: reading.temperature != null ? parseFloat(reading.temperature) : 0,
        humidity: reading.humidity != null ? parseFloat(reading.humidity) : 0,
        heart_rate: reading.heartRate ?? reading.heart_rate ?? 0,
      }));
  }, [pollingData, timeRange]);

  // Get latest reading with normalized field names
  const latestReading = useMemo(() => {
    if (!polledLatestReading) return null;
    return {
      ...polledLatestReading,
      heart_rate: polledLatestReading.heartRate || polledLatestReading.heart_rate,
    };
  }, [polledLatestReading]);

  // Update "time ago" display every second
  useEffect(() => {
    if (!lastUpdated) {
      setTimeSinceData("");
      return;
    }

    const updateTime = () => {
      const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
      if (seconds < 60) {
        setTimeSinceData(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setTimeSinceData(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setTimeSinceData(`${Math.floor(seconds / 3600)}h ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Fetch animals list (dropdown only — does not affect sensor data)
  useEffect(() => {
    const fetchAnimals = async () => {
      if (!mongoUser) return;
      try {
        const response = await fetch(`${API_BASE}/api/animals?farmerId=${mongoUser._id}`);
        if (response.ok) {
          const data = await response.json();
          setAnimals(data.map(a => ({ id: a._id, name: a.name, species: a.species, rfid: a.rfid, gender: a.gender, createdAt: a.createdAt, reproductiveStatus: a.reproductiveStatus || 'none' })));
        }
      } catch (error) {
        console.error("Failed to fetch animals:", error);
      }
    };
    fetchAnimals();
  }, [mongoUser]);

  // Fetch isolation alerts periodically
  useEffect(() => {
    const fetchIsolationAlerts = async () => {
      if (!mongoUser) return;
      try {
        setLoadingAlerts(true);
        const response = await fetch(`${API_BASE}/api/iot/isolation-alerts?farmerId=${mongoUser._id}`);
        if (response.ok) {
          const data = await response.json();
          setIsolationAlerts(data);
        }
      } catch (error) {
        console.error("Failed to fetch isolation alerts:", error);
      } finally {
        setLoadingAlerts(false);
      }
    };

    fetchIsolationAlerts();
    // Poll every 10 seconds for new isolation alerts
    const interval = setInterval(fetchIsolationAlerts, 10000);
    return () => clearInterval(interval);
  }, [mongoUser]);

  // Handle isolation alert resolution
  const resolveIsolationAlert = async (alertId, animalName) => {
    try {
      const response = await fetch(`${API_BASE}/api/iot/isolation-alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolvedBy: 'farmer',
          resolutionNotes: `${animalName} has been isolated`
        })
      });

      if (response.ok) {
        toast.success(`${animalName} has been separated from the herd`);
        // Remove from local state
        setIsolationAlerts(prev => prev.filter(alert => alert._id !== alertId));
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Failed to resolve isolation alert:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // Loading state derived from polling status
  const loading = status === 'idle' || (status === 'polling' && historicalData.length === 0);

  // Memoized chart data
  const chartData = useMemo(() => historicalData, [historicalData]);

  return (
    <Layout>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Live Animal Health
            </h1>
          </div>
          <ConnectionStatus
            status={status}
            iotStatus={iotStatus}
            lastUpdated={lastUpdated}
            timeSinceData={timeSinceData}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Animal Selector — for reference only, does not filter live data */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Animal:</span>
            <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select animal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    All / Live Feed
                  </span>
                </SelectItem>
                {animals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    {animal.name || `Animal (${animal.rfid?.slice(0, 6)})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range Selector */}
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList>
              {Object.entries(TIME_RANGES).map(([key, { label }]) => (
                <TabsTrigger key={key} value={key}>
                  {label.replace("Last ", "")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Last reading timestamp */}
        {latestReading && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-green-500" />
                <span>Last reading: {format(new Date(latestReading.timestamp), "PPpp")}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Body Temperature"
            value={latestReading?.temperature ? parseFloat(latestReading.temperature).toFixed(1) : null}
            unit="°C"
            icon={Thermometer}
            color="text-orange-500"
            trend={latestReading ? `Updates every 1 second` : null}
          />
          <StatCard
            title="Moisture in Air"
            value={latestReading?.humidity ? parseFloat(latestReading.humidity).toFixed(1) : null}
            unit="%"
            icon={Droplets}
            color="text-blue-500"
            trend={latestReading ? `Updates every 1 second` : null}
          />
          <StatCard
            title="Heartbeat"
            value={latestReading?.heart_rate}
            unit="BPM"
            icon={Heart}
            color="text-red-500"
            trend={latestReading ? `Updates every 1 second` : null}
          />
        </div>

        {/* Neckband Lifespan Tracker */}
        {animals.length > 0 && <NeckbandLifespan animals={animals} />}

        {/* Charts */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-80 animate-pulse bg-muted" />
            ))}
          </div>
        ) : chartData.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            <VitalChart
              data={chartData}
              dataKey="temperature"
              title="Body Temperature"
              color="hsl(24, 95%, 53%)"
              unit="°C"
              yDomain={[20, 45]}
              timeRange={timeRange}
            />
            <VitalChart
              data={chartData}
              dataKey="humidity"
              title="Moisture in Air"
              color="hsl(210, 100%, 50%)"
              unit="%"
              yDomain={[0, 100]}
              timeRange={timeRange}
            />
            <VitalChart
              data={chartData}
              dataKey="heart_rate"
              title="Heartbeat"
              color="hsl(0, 84%, 60%)"
              unit=" BPM"
              yDomain={[40, 120]}
              timeRange={timeRange}
            />
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No readings yet</h3>
            <p className="text-muted-foreground">
              Waiting for sensor data. Make sure the ESP32 is plugged in and <code>serialBridge.js</code> is running.
            </p>
          </Card>
        )}

        {/* Animals to be Isolated Section — deduplicated per animal */}
        {!loadingAlerts && (
          <Card className={isolationAlerts.length > 0 ? "border-red-200 dark:border-red-900" : "border-green-200 dark:border-green-900"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldAlert className={`h-6 w-6 ${isolationAlerts.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  <div>
                    <CardTitle className="text-xl">Sick Animals — Keep Separate</CardTitle>
                    <CardDescription>
                      {isolationAlerts.length > 0 
                        ? "These animals are not feeling well. Keep them away from the herd so others don't get sick."
                        : "Checked sensor readings — all animals look healthy right now."}
                    </CardDescription>
                  </div>
                </div>
                {isolationAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    {isolationAlerts.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isolationAlerts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Deduplicate: show only the latest alert per animal */}
                  {Object.values(
                    isolationAlerts.reduce((acc, alert) => {
                      const key = alert.animalId?._id || alert._id;
                      if (!acc[key] || new Date(alert.createdAt) > new Date(acc[key].createdAt)) {
                        acc[key] = alert;
                      }
                      return acc;
                    }, {})
                  ).map((alert) => (
                    <Card key={alert._id} className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                      <CardContent className="pt-4 pb-3">
                        <div className="space-y-2.5">
                          {/* Animal Info */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <h4 className="font-bold text-base truncate">{alert.animalId?.name || "Unknown Animal"}</h4>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {alert.animalId?.species || "Unknown"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                RFID: {alert.animalId?.rfid || "N/A"}
                              </p>
                            </div>
                            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                          </div>

                          {/* Alert Reason */}
                          <div className="bg-background/50 rounded-lg p-2">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400 leading-tight">
                              {alert.message.replace('🚨 ', '')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(alert.createdAt), "MMM dd, yyyy p")}
                            </p>
                          </div>

                          {/* Current Vitals */}
                          {alert.latestVitals && (
                            <div className="grid grid-cols-3 gap-1.5">
                              {alert.latestVitals.temperature && (
                                <div className="bg-background/50 rounded-lg p-1.5 text-center">
                                  <Thermometer className={`h-3.5 w-3.5 mx-auto mb-0.5 ${
                                    alert.latestVitals.temperature > 40 ? 'text-red-500' : 'text-orange-500'
                                  }`} />
                                  <p className={`text-xs font-bold leading-tight ${
                                    alert.latestVitals.temperature > 40 ? 'text-red-600 dark:text-red-400' : ''
                                  }`}>
                                    {alert.latestVitals.temperature.toFixed(1)}°C
                                  </p>
                                  <p className="text-xs text-muted-foreground">Temp</p>
                                </div>
                              )}
                              {alert.latestVitals.heartRate && (
                                <div className="bg-background/50 rounded-lg p-1.5 text-center">
                                  <Heart className={`h-3.5 w-3.5 mx-auto mb-0.5 ${
                                    alert.latestVitals.heartRate > 100 ? 'text-red-500' : 'text-pink-500'
                                  }`} />
                                  <p className={`text-xs font-bold leading-tight ${
                                    alert.latestVitals.heartRate > 100 ? 'text-red-600 dark:text-red-400' : ''
                                  }`}>
                                    {alert.latestVitals.heartRate}BPM
                                  </p>
                                  <p className="text-xs text-muted-foreground">HR</p>
                                </div>
                              )}
                              {alert.latestVitals.humidity && (
                                <div className="bg-background/50 rounded-lg p-1.5 text-center">
                                  <Droplets className="h-3.5 w-3.5 text-blue-500 mx-auto mb-0.5" />
                                  <p className="text-xs font-bold leading-tight">
                                    {alert.latestVitals.humidity.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">Humid</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Button */}
                          <Button 
                            onClick={() => resolveIsolationAlert(alert._id, alert.animalId?.name)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm h-9 py-2"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Done — Separated
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
                    All Animals are Healthy!
                  </h3>
                  <p className="text-muted-foreground">
                    No animal needs to be separated right now. Keep it up!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Data Summary */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <span className="text-sm text-muted-foreground">Total Readings</span>
                  <p className="text-2xl font-bold">{chartData.length}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Avg Body Temp</span>
                  <p className="text-2xl font-bold">
                    {(chartData.reduce((sum, d) => sum + (d.temperature || 0), 0) / 
                      chartData.filter(d => d.temperature).length).toFixed(1)}°C
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Avg Moisture</span>
                  <p className="text-2xl font-bold">
                    {(chartData.reduce((sum, d) => sum + (d.humidity || 0), 0) / 
                      chartData.filter(d => d.humidity).length).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Avg Heartbeat</span>
                  <p className="text-2xl font-bold">
                    {Math.round(chartData.reduce((sum, d) => sum + (d.heart_rate || 0), 0) / 
                      chartData.filter(d => d.heart_rate).length)} BPM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
