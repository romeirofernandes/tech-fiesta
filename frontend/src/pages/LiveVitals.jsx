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
import { useWebSocket } from "@/hooks/useWebSocket";
import { format } from "date-fns";
import { toast } from "sonner";

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE_PYTHON_URL || "http://127.0.0.1:8080";
const WS_URL = `ws://${API_BASE.replace(/^https?:\/\//, "").replace(/\/$/, "")}/ws/sensors/`;

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
      <div className="h-[250px]">
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
  const [historicalData, setHistoricalData] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastDataReceived, setLastDataReceived] = useState(null); // Timestamp of last WebSocket data
  const [dataSource, setDataSource] = useState("database"); // "realtime" or "database"
  const [timeSinceData, setTimeSinceData] = useState("");

  // WebSocket connection (optional - gracefully falls back to historical data only)
  const { message, status } = useWebSocket(WS_URL, {
    reconnectInterval: 10000, // Try reconnecting every 10 seconds
    maxRetries: 999, // Keep trying indefinitely but silently
  });

  // Update "time ago" display every second
  useEffect(() => {
    if (!lastDataReceived) {
      setTimeSinceData("");
      return;
    }

    const updateTime = () => {
      const seconds = Math.floor((Date.now() - lastDataReceived) / 1000);
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
  }, [lastDataReceived]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!message) return;

    if (message.type === "sensor_update") {
      const data = message.data;
      
      // Update latest reading if it matches selected animal or we're showing "latest"
      if (selectedAnimal === "latest" || data.rfid_tag === selectedAnimal) {
        setLatestReading(data);
        setLastDataReceived(Date.now()); // Track when real IoT data was received
        setDataSource("realtime"); // Mark as real-time data
        
        // Add to historical data
        setHistoricalData((prev) => {
          const newPoint = {
            time: format(new Date(data.timestamp), "HH:mm:ss"),
            timestamp: new Date(data.timestamp).getTime(),
            temperature: data.temperature ? parseFloat(data.temperature) : null,
            humidity: data.humidity ? parseFloat(data.humidity) : null,
            heart_rate: data.heart_rate,
            rfid_tag: data.rfid_tag,
            animal_name: data.animal_name,
          };
          
          // Keep data within time range
          if (timeRange === "all") {
            return [...prev, newPoint]; // Keep all data for "all time"
          }
          const cutoffTime = Date.now() - TIME_RANGES[timeRange].minutes * 60 * 1000;
          const filtered = [...prev, newPoint].filter(
            (point) => point.timestamp > cutoffTime
          );
          
          return filtered;
        });
      }
    } else if (message.type === "initial_data" && message.data?.length > 0) {
      // Handle initial data from WebSocket
      const data = message.data[0];
      if (selectedAnimal === "latest") {
        setLatestReading(data);
      }
    }
  }, [message, selectedAnimal, timeRange]);

  // Fetch animals list
  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/iot/animals/`);
        if (response.ok) {
          const data = await response.json();
          setAnimals(data);
        }
      } catch (error) {
        console.error("Failed to fetch animals:", error);
        toast.error("Failed to load animals list");
      }
    };

    fetchAnimals();
  }, []);

  // Fetch historical data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/api/iot/sensors/latest/?limit=500`;
        if (selectedAnimal !== "latest") {
          url += `&rfid=${selectedAnimal}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          // Filter by time range and transform data
          const transformed = data
            .filter((reading) => {
              if (timeRange === "all") {
                return true; // Include all readings for "all time"
              }
              const cutoffTime = Date.now() - TIME_RANGES[timeRange].minutes * 60 * 1000;
              return new Date(reading.timestamp).getTime() > cutoffTime;
            })
            .map((reading) => ({
              time: format(new Date(reading.timestamp), 
                timeRange === "7d" || timeRange === "all" ? "MM/dd HH:mm" : "HH:mm"),
              timestamp: new Date(reading.timestamp).getTime(),
              temperature: reading.temperature ? parseFloat(reading.temperature) : null,
              humidity: reading.humidity ? parseFloat(reading.humidity) : null,
              heart_rate: reading.heart_rate,
              rfid_tag: reading.rfid_tag,
              animal_name: reading.animal_name,
            }))
            .reverse(); // Oldest first for chart

          setHistoricalData(transformed);
          
          // Set latest reading from historical data if available
            setDataSource("database"); // Mark as database data
          if (data.length > 0 && !latestReading) {
            setLatestReading(data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch historical data:", error);
        toast.error("Failed to load historical data");
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [selectedAnimal, timeRange]);

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* WebSocket Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Backend:</span>
        {status === "connected" ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
              Connected
            </Badge>
          </>
        ) : status === "connecting" ? (
          <>
            <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
              Connecting...
            </Badge>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
              Offline
            </Badge>
          </>
        )}
      </div>

      {/* IoT Data Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">IoT Data:</span>
        {lastDataReceived ? (
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
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
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
              <SelectTrigger className="w-[200px]">
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
            trend={latestReading ? `DHT11 sensor • ${dataSource === "realtime" ? "Live" : "From database"}` : null}
          />
          <StatCard
            title="Humidity"
            value={latestReading?.humidity ? parseFloat(latestReading.humidity).toFixed(1) : null}
            unit="%"
            icon={Droplets}
            color="text-blue-500"
            trend={latestReading ? `DHT11 sensor • ${dataSource === "realtime" ? "Live" : "From database"}` : null}
          />
          <StatCard
            title="Heart Rate"
            value={latestReading?.heart_rate}
            unit="BPM"
            icon={Heart}
            color="text-red-500"
            trend={latestReading ? `MAX30102 sensor • ${dataSource === "realtime" ? "Live" : "From database"}` : null}
          />
        </div>

        {/* Charts */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-[320px] animate-pulse bg-muted" />
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
