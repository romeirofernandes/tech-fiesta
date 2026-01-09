import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplets, Wind, Activity, AlertCircle } from "lucide-react";
import axios from "axios";

export default function SensorData() {
  const [sensorEvents, setSensorEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSensorData();
  }, []);

  const fetchSensorData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/sensor-events`);
      setSensorEvents(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading sensor data...</div>;

  // Process sensor data
  const latestReadings = sensorEvents.slice(0, 20);
  
  // Group by sensor type
  const sensorTypes = sensorEvents.reduce((acc, event) => {
    const type = event.sensorType || 'unknown';
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        readings: [],
        lastReading: null
      };
    }
    acc[type].count++;
    acc[type].readings.push(event.value);
    if (!acc[type].lastReading || new Date(event.timestamp) > new Date(acc[type].lastReading.timestamp)) {
      acc[type].lastReading = event;
    }
    return acc;
  }, {});

  // Calculate averages
  const calculateStats = (readings) => {
    if (readings.length === 0) return { avg: 0, min: 0, max: 0 };
    const avg = readings.reduce((sum, val) => sum + val, 0) / readings.length;
    return {
      avg: avg.toFixed(1),
      min: Math.min(...readings),
      max: Math.max(...readings)
    };
  };

  const getIconForSensor = (type) => {
    switch(type?.toLowerCase()) {
      case 'temperature': return <Thermometer className="h-5 w-5" />;
      case 'humidity': return <Droplets className="h-5 w-5" />;
      case 'air_quality': return <Wind className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getUnitForSensor = (type) => {
    switch(type?.toLowerCase()) {
      case 'temperature': return '°C';
      case 'humidity': return '%';
      case 'air_quality': return 'AQI';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sensor Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(sensorTypes).map(([type, data]) => {
          const stats = calculateStats(data.readings);
          const isAbnormal = type === 'temperature' && (stats.max > 40 || stats.min < 10);
          
          return (
            <Card key={type} className={isAbnormal ? "border-red-200" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getIconForSensor(type)}
                    <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                  </div>
                  {isAbnormal && <AlertCircle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">
                      {data.lastReading?.value || 0}{getUnitForSensor(type)}
                    </p>
                    <p className="text-xs text-muted-foreground">Current reading</p>
                  </div>
                  <div className="pt-2 border-t space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average:</span>
                      <span>{stats.avg}{getUnitForSensor(type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Range:</span>
                      <span>{stats.min} - {stats.max}{getUnitForSensor(type)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert for abnormal readings */}
      {Object.entries(sensorTypes).some(([type, data]) => {
        const stats = calculateStats(data.readings);
        return (type === 'temperature' && (stats.max > 40 || stats.min < 10)) ||
               (type === 'humidity' && (stats.max > 80 || stats.min < 20));
      }) && (
        <Card className="border-orange-200">
          <CardContent className="p-4 bg-orange-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Abnormal Environmental Conditions Detected</p>
                <p className="text-sm text-orange-800">
                  Some sensors are reporting values outside normal ranges. Check environmental controls.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Readings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sensor Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {latestReadings.map((reading) => (
              <div key={reading._id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {getIconForSensor(reading.sensorType)}
                    <div>
                      <p className="font-medium capitalize">
                        {reading.sensorType?.replace('_', ' ')} Sensor
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Location: {reading.location || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {reading.value}{getUnitForSensor(reading.sensorType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reading.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}