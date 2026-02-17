import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadarDisplay } from '@/components/RadarDisplay';
import { useRadarPolling } from '@/hooks/useRadarPolling';
import { Radio, Activity, MapPin, AlertTriangle, RefreshCw, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function Geofencing() {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Use radar polling hook
  const {
    sweepData,
    latestAlert,
    stats,
    status,
    radarStatus,
    lastUpdated,
    refetch
  } = useRadarPolling(API_BASE, {
    pollInterval: 2000,
    deviceId: 'radar_01',
    limit: 180,
    enabled: true
  });

  // Get browser geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError(error.message);
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  // Fetch movement alerts
  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const response = await fetch(`${API_BASE}/api/radar/alerts?deviceId=radar_01&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
    setLoadingAlerts(false);
  };

  // Resolve alert
  const resolveAlert = async (alertId) => {
    try {
      const response = await fetch(`${API_BASE}/api/radar/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'farmer', resolutionNotes: 'Checked and resolved' })
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  // Calculate nearest object
  const nearestObject = sweepData.length > 0
    ? sweepData.reduce((min, point) => point.distance < min.distance ? point : min, sweepData[0])
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-8 w-8 text-primary" />
            Geofencing Radar
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time movement detection and boundary monitoring
          </p>
        </div>

        {/* Status Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Radar Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Radar:</span>
                {status === 'connected' ? (
                  <>
                    <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                      Active
                    </Badge>
                  </>
                ) : status === 'polling' ? (
                  <>
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                      Scanning...
                    </Badge>
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4 text-red-500" />
                    <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                      Disconnected
                    </Badge>
                  </>
                )}
              </div>

              {/* IoT Connection Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Device:</span>
                {radarStatus === 'connected' ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                      Connected
                    </Badge>
                  </>
                ) : radarStatus === 'disconnected' ? (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                      Disconnected
                    </Badge>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-gray-400" />
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400">
                      Unknown
                    </Badge>
                  </>
                )}
              </div>

              {/* Location Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium">Location:</span>
                {location ? (
                  <>
                    <MapPin className="h-4 w-4 text-green-500" />
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </Badge>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <Badge variant="outline">
                      {locationError || 'Getting location...'}
                    </Badge>
                  </>
                )}
              </div>

              {/* Last Update */}
              {lastUpdated && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Last Update:</span>
                  <Activity className="h-4 w-4 text-green-500" />
                  <Badge variant="outline">
                    {format(lastUpdated, 'HH:mm:ss')}
                  </Badge>
                </div>
              )}

              {/* Refresh Button */}
              <Button
                onClick={refetch}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Display - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RadarDisplay sweepData={sweepData} />
          </div>

          {/* Stats & Info */}
          <div className="space-y-6">
            {/* Live Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Live Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Nearest Object */}
                {nearestObject && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Nearest Object</div>
                    <div className="text-2xl font-bold">
                      {nearestObject.distance.toFixed(1)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">cm</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      at {nearestObject.angle}°
                    </div>
                  </div>
                )}

                {/* 24h Stats */}
                {stats && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Total Scans</span>
                      <span className="font-semibold">{stats.totalReadings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Total Alerts</span>
                      <span className="font-semibold">{stats.totalAlerts}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Unresolved</span>
                      <span className="font-semibold text-red-600">{stats.unresolvedAlerts}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Latest Alert */}
            {latestAlert && (
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Latest Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">{latestAlert.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(latestAlert.timestamp), 'PPp')}
                    </div>
                    <Button
                      onClick={() => resolveAlert(latestAlert._id)}
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Movement History */}
        <Card>
          <CardHeader>
            <CardTitle>Movement History</CardTitle>
            <CardDescription>Recent geofence violations and detections</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAlerts ? (
              <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No alerts detected yet</div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`p-4 rounded-lg border ${
                      alert.isResolved
                        ? 'bg-muted/30 border-muted'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`h-4 w-4 ${alert.isResolved ? 'text-muted-foreground' : 'text-red-500'}`} />
                          <span className={`text-sm font-medium ${alert.isResolved ? 'text-muted-foreground' : ''}`}>
                            {alert.message}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(alert.timestamp), 'PPp')}
                          {alert.location && (
                            <span className="ml-2">
                              • {alert.location.lat?.toFixed(4)}, {alert.location.lng?.toFixed(4)}
                            </span>
                          )}
                        </div>
                        {alert.isResolved && alert.resolvedAt && (
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ Resolved {format(new Date(alert.resolvedAt), 'PPp')}
                          </div>
                        )}
                      </div>
                      {!alert.isResolved && (
                        <Button
                          onClick={() => resolveAlert(alert._id)}
                          size="sm"
                          variant="outline"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
