import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useIotPolling } from "@/hooks/useIotPolling";
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
  "all": { label: "All Time", minutes: null },
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm text-muted-foreground">{label}</p>
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
const VitalChart = ({ data, dataKey, title, color, unit, yDomain }) => (
  <Card className="col-span-1">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>Real-time and historical data</CardDescription>
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
            />
            <YAxis
              domain={yDomain || ["auto", "auto"]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip content={<CustomTooltip />} />
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
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

export default function LiveVitals() {
  // State
  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState("latest");
  const [timeRange, setTimeRange] = useState("1h");
  const [timeSinceData, setTimeSinceData] = useState("");

  // Long polling for IoT sensor data (replaces WebSocket)
  const { 
    data: pollingData, 
    latestReading: polledLatestReading, 
    status, 
    lastUpdated,
    refetch 
  } = useIotPolling(API_BASE, {
    pollInterval: 5000, // Poll every 5 seconds
    rfid: selectedAnimal === "latest" ? null : selectedAnimal,
    limit: 500,
    enabled: true,
    onNewData: (newData) => {
      // Optional: show toast for new data in real-time mode
      if (newData.length > 0) {
        console.log(`Received ${newData.length} new readings`);
      }
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
      .map((reading) => ({
        time: format(
          new Date(reading.timestamp),
          timeRange === "7d" || timeRange === "all" ? "MM/dd HH:mm" : "HH:mm"
        ),
        timestamp: new Date(reading.timestamp).getTime(),
        temperature: reading.temperature ? parseFloat(reading.temperature) : null,
        humidity: reading.humidity ? parseFloat(reading.humidity) : null,
        heart_rate: reading.heartRate || reading.heart_rate,
        rfid_tag: reading.rfidTag || reading.rfid_tag,
        animal_name: reading.animalId?.name || reading.animal_name || "Unknown",
      }));
  }, [pollingData, timeRange]);

  // Get latest reading with normalized field names
  const latestReading = useMemo(() => {
    if (!polledLatestReading) return null;
    return {
      ...polledLatestReading,
      rfid_tag: polledLatestReading.rfidTag || polledLatestReading.rfid_tag,
      heart_rate: polledLatestReading.heartRate || polledLatestReading.heart_rate,
      animal_name: polledLatestReading.animalId?.name || polledLatestReading.animal_name || "Unknown",
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

  // Fetch animals list from main animals API
  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/animals`);
        if (response.ok) {
          const data = await response.json();
          // Transform to match expected format
          const transformed = data.map(animal => ({
            rfid_tag: animal.rfid,
            name: animal.name,
            species: animal.species,
          }));
          setAnimals(transformed);
        }
      } catch (error) {
        console.error("Failed to fetch animals:", error);
        toast.error("Failed to load animals list");
      }
    };

    fetchAnimals();
  }, []);

  // Loading state derived from polling status
  const loading = status === 'idle' || (status === 'polling' && historicalData.length === 0);

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Polling Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Backend:</span>
        {status === "connected" ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
              Connected
            </Badge>
          </>
        ) : status === "polling" ? (
          <>
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              Polling...
            </Badge>
          </>
        ) : status === "error" ? (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
              Error
            </Badge>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 text-yellow-500" />
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
              Initializing...
            </Badge>
          </>
        )}
      </div>

      {/* IoT Data Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Last Update:</span>
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
              No data yet
            </Badge>
          </>
        )}
      </div>
    </div>
  );

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
              Live Animal Vitals
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time health monitoring from IoT sensors
            </p>
          </div>
          <ConnectionStatus />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Animal Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Animal:</span>
            <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Select animal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Latest Active
                  </span>
                </SelectItem>
                {animals.map((animal) => (
                  <SelectItem key={animal.rfid_tag} value={animal.rfid_tag}>
                    {animal.name || `Animal-${animal.rfid_tag.slice(0, 8)}`}
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

        {/* Current Animal Info */}
        {latestReading && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Current Animal:</span>
                  <p className="font-semibold">{latestReading.animal_name || "Unknown"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">RFID Tag:</span>
                  <p className="font-mono text-sm">{latestReading.rfid_tag}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Last Update:</span>
                  <p className="text-sm">
                    {format(new Date(latestReading.timestamp), "PPpp")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Temperature"
            value={latestReading?.temperature ? parseFloat(latestReading.temperature).toFixed(1) : null}
            unit="°C"
            icon={Thermometer}
            color="text-orange-500"
            trend={latestReading ? `DHT11 sensor • Polling every 5s` : null}
          />
          <StatCard
            title="Humidity"
            value={latestReading?.humidity ? parseFloat(latestReading.humidity).toFixed(1) : null}
            unit="%"
            icon={Droplets}
            color="text-blue-500"
            trend={latestReading ? `DHT11 sensor • Polling every 5s` : null}
          />
          <StatCard
            title="Heart Rate"
            value={latestReading?.heart_rate}
            unit="BPM"
            icon={Heart}
            color="text-red-500"
            trend={latestReading ? `MAX30102 sensor • Polling every 5s` : null}
          />
        </div>

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
              title="Temperature"
              color="hsl(24, 95%, 53%)"
              unit="°C"
              yDomain={[20, 45]}
            />
            <VitalChart
              data={chartData}
              dataKey="humidity"
              title="Humidity"
              color="hsl(210, 100%, 50%)"
              unit="%"
              yDomain={[0, 100]}
            />
            <VitalChart
              data={chartData}
              dataKey="heart_rate"
              title="Heart Rate"
              color="hsl(0, 84%, 60%)"
              unit=" BPM"
              yDomain={[40, 120]}
            />
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              Waiting for sensor data. Make sure the ESP32 is connected and an RFID card has been scanned.
            </p>
          </Card>
        )}

        {/* Data Summary */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <span className="text-sm text-muted-foreground">Total Readings</span>
                  <p className="text-2xl font-bold">{chartData.length}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Avg Temperature</span>
                  <p className="text-2xl font-bold">
                    {(chartData.reduce((sum, d) => sum + (d.temperature || 0), 0) / 
                      chartData.filter(d => d.temperature).length).toFixed(1)}°C
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Avg Humidity</span>
                  <p className="text-2xl font-bold">
                    {(chartData.reduce((sum, d) => sum + (d.humidity || 0), 0) / 
                      chartData.filter(d => d.humidity).length).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Avg Heart Rate</span>
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
