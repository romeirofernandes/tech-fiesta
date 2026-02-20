import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
import { getMapTile } from '@/lib/mapTiles';
import {
  MapPin, ArrowLeft, AlertTriangle, Clock, Eye, Footprints, Shield
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

// Leaflet imports
import { MapContainer, TileLayer, Circle, Polyline, CircleMarker, Tooltip, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for leaflet in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const SPECIES_COLORS = {
  cow: '#22c55e',
  buffalo: '#3b82f6',
  goat: '#f59e0b',
  sheep: '#8b5cf6',
  chicken: '#ec4899',
  pig: '#f97316',
  horse: '#06b6d4',
  other: '#6b7280',
};

const SPECIES_EMOJIS = {
  cow: '🐄', buffalo: '🐃', goat: '🐐', sheep: '🐑',
  chicken: '🐔', pig: '🐷', horse: '🐴', other: '🐾',
};

const STRAY_COLOR = '#ef4444';

/** Helper to format duration */
function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '—';
  const ms = new Date(endTime) - new Date(startTime);
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Component to animate map fly-to */
function FlyTo({ center, zoom, onDone }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, {
        duration: 2.2,
        easeLinearity: 0.15,
      });
      const handler = () => onDone?.();
      map.once('moveend', handler);
      return () => map.off('moveend', handler);
    }
  }, [center, zoom, map, onDone]);
  return null;
}

/** Component to fit map bounds to markers */
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [bounds, map]);
  return null;
}

export default function HerdWatch() {
  const { mongoUser } = useUser();
  const { theme } = useTheme();
  const { url: tileUrl, attribution: tileAttribution } = getMapTile(theme);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [paths, setPaths] = useState([]);
  const [farmData, setFarmData] = useState(null);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [showBoundary, setShowBoundary] = useState(false);

  const farmerId = mongoUser?._id;

  // Fetch all farms for overview
  const fetchFarms = useCallback(async () => {
    if (!farmerId) return;
    setLoadingFarms(true);
    try {
      const res = await axios.get(`${BASE}/api/herd-watch/farms`, {
        params: { farmerId }
      });
      setFarms(res.data || []);
    } catch (err) {
      console.error('Failed to fetch farms:', err);
      toast.error('Could not load farms');
    } finally {
      setLoadingFarms(false);
    }
  }, [farmerId]);

  // Fetch paths for a selected farm
  const fetchPaths = useCallback(async (farmId) => {
    if (!farmerId) return;
    setLoadingPaths(true);
    try {
      const res = await axios.get(`${BASE}/api/herd-watch/${farmId}/paths`, {
        params: { farmerId }
      });
      setFarmData(res.data.farm);
      setPaths(res.data.paths || []);
    } catch (err) {
      console.error('Failed to fetch paths:', err);
      toast.error('Could not load animal paths');
    } finally {
      setLoadingPaths(false);
    }
  }, [farmerId]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  const handleFarmClick = (farm) => {
    setShowBoundary(false);
    setSelectedFarm(farm);
    fetchPaths(farm._id);
  };

  const handleBack = () => {
    setShowBoundary(false);
    setSelectedFarm(null);
    setPaths([]);
    setFarmData(null);
  };

  // Straying animals
  const strayingAnimals = useMemo(() => {
    return paths.filter(p => p.isStraying && p.animalId);
  }, [paths]);

  // Overview bounds
  const overviewBounds = useMemo(() => {
    if (farms.length === 0) return null;
    return farms
      .filter(f => f.coordinates?.lat && f.coordinates?.lng)
      .map(f => [f.coordinates.lat, f.coordinates.lng]);
  }, [farms]);

  // Default center
  const defaultCenter = useMemo(() => {
    if (farms.length > 0 && farms[0].coordinates?.lat) {
      return [farms[0].coordinates.lat, farms[0].coordinates.lng];
    }
    return [20.5937, 78.9629]; // Center of India
  }, [farms]);

  return (
    <Layout>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedFarm && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                Herd Watch
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedFarm
                  ? `Tracking animals in ${selectedFarm.name}`
                  : 'Click on a farm to see animal paths'}
              </p>
            </div>
          </div>
          {selectedFarm && farmData && (
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Boundary: {farmData.herdWatchRadius}m
            </Badge>
          )}
        </div>

        {/* Straying alert banner */}
        {selectedFarm && strayingAnimals.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                Animal Straying Alert
              </p>
              {strayingAnimals.map(p => (
                <p key={p._id} className="text-sm text-amber-700 dark:text-amber-300">
                  {SPECIES_EMOJIS[p.animalId?.species] || '🐾'}{' '}
                  <span className="font-bold">{p.animalId?.name}</span> has strayed{' '}
                  <span className="font-bold">{p.distanceFromFarm}m</span> from the farm boundary
                  {farmData && ` (limit: ${farmData.herdWatchRadius}m)`}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map */}
          <Card className="lg:col-span-3 overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1">
              <div className="h-full min-h-130 relative">
                {loadingFarms ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : (
                  <MapContainer
                    center={defaultCenter}
                    zoom={5}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    attributionControl={false}
                  >
                    <TileLayer
                      url={tileUrl}
                      attribution={tileAttribution}
                      maxZoom={20}
                    />

                {/* Overview mode: fit all farm markers */}
                {!selectedFarm && overviewBounds && overviewBounds.length > 0 && (
                  <FitBounds bounds={overviewBounds} />
                )}

                {/* Overview mode: farm markers */}
                {!selectedFarm && farms.map(farm => (
                  farm.coordinates?.lat && (
                    <Marker
                      key={farm._id}
                      position={[farm.coordinates.lat, farm.coordinates.lng]}
                      eventHandlers={{
                        click: () => handleFarmClick(farm)
                      }}
                    >
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold">{farm.name}</p>
                          <p className="text-xs text-muted-foreground">{farm.location}</p>
                          <p className="text-xs mt-1">{farm.animalCount} animal{farm.animalCount !== 1 ? 's' : ''}</p>
                          <button
                            className="mt-2 text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
                            onClick={() => handleFarmClick(farm)}
                          >
                            View Paths
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}

                {/* Drilled-in mode: fly to farm */}
                {selectedFarm && farmData && (
                  <FlyTo
                    center={[farmData.coordinates.lat, farmData.coordinates.lng]}
                    zoom={15}
                    onDone={() => setShowBoundary(true)}
                  />
                )}

                {/* Drilled-in mode: farm boundary circle (shown after fly animation) */}
                {selectedFarm && farmData && showBoundary && (
                  <Circle
                    center={[farmData.coordinates.lat, farmData.coordinates.lng]}
                    radius={farmData.herdWatchRadius}
                    pathOptions={{
                      color: '#22c55e',
                      weight: 1.5,
                      dashArray: '6 6',
                      fillColor: '#22c55e',
                      fillOpacity: 0.03,
                    }}
                  >
                    <Tooltip direction="top" permanent>
                      <span className="font-bold">{farmData.name}</span> — {farmData.herdWatchRadius}m boundary
                    </Tooltip>
                  </Circle>
                )}

                {/* Drilled-in mode: animal paths */}
                {selectedFarm && paths.map(path => {
                  if (!path.waypoints || path.waypoints.length === 0 || !path.animalId) return null;

                  const positions = path.waypoints.map(wp => [wp.lat, wp.lng]);
                  const lastPos = positions[positions.length - 1];
                  const color = path.isStraying
                    ? STRAY_COLOR
                    : (SPECIES_COLORS[path.animalId.species] || SPECIES_COLORS.other);

                  return (
                    <span key={path._id}>
                      {/* Path polyline */}
                      <Polyline
                        positions={positions}
                        pathOptions={{
                          color,
                          weight: 3,
                          opacity: 0.8,
                          ...(path.isStraying ? { dashArray: '6 4' } : {})
                        }}
                      >
                        <Tooltip sticky>
                          <span>
                            {SPECIES_EMOJIS[path.animalId.species] || '🐾'}{' '}
                            <strong>{path.animalId.name}</strong>
                            {path.isStraying && ' ⚠️ Straying!'}
                          </span>
                        </Tooltip>
                      </Polyline>

                      {/* Current position marker */}
                      <CircleMarker
                        center={lastPos}
                        radius={7}
                        pathOptions={{
                          color: '#fff',
                          weight: 2,
                          fillColor: color,
                          fillOpacity: 1,
                        }}
                      >
                        <Tooltip>
                          <strong>{path.animalId.name}</strong>
                          {path.isStraying && ` — ${path.distanceFromFarm}m away`}
                        </Tooltip>
                      </CircleMarker>

                      {/* Start position (smaller, faded) */}
                      <CircleMarker
                        center={positions[0]}
                        radius={4}
                        pathOptions={{
                          color: color,
                          weight: 1,
                          fillColor: color,
                          fillOpacity: 0.4,
                        }}
                      >
                        <Tooltip>Start: {path.animalId.name}</Tooltip>
                      </CircleMarker>
                    </span>
                  );
                })}
              </MapContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            {!selectedFarm ? (
              /* Overview: Farm list */
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Your Farms ({farms.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {farms.length === 0 && !loadingFarms && (
                    <p className="text-sm text-muted-foreground">
                      No farms with coordinates found. Please seed data first.
                    </p>
                  )}
                  {farms.map(farm => (
                    <button
                      key={farm._id}
                      onClick={() => handleFarmClick(farm)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <p className="font-medium text-sm">{farm.name}</p>
                      <p className="text-xs text-muted-foreground">{farm.location}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {farm.animalCount} animal{farm.animalCount !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {farm.herdWatchRadius}m radius
                        </Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ) : (
              /* Drilled-in: Animal list */
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Animals ({paths.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-110 overflow-y-auto">
                    {loadingPaths ? (
                      <div className="flex justify-center py-6">
                        <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      </div>
                    ) : paths.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No animal paths found for this farm.</p>
                    ) : (
                      paths.map(path => {
                        if (!path.animalId) return null;
                        const species = path.animalId.species;
                        const color = path.isStraying ? STRAY_COLOR : (SPECIES_COLORS[species] || SPECIES_COLORS.other);

                        return (
                          <div
                            key={path._id}
                            className={`p-3 rounded-lg border transition-colors ${
                              path.isStraying
                                ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-sm font-medium">
                                  {SPECIES_EMOJIS[species] || '🐾'} {path.animalId.name}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {path.animalId.species}
                              </Badge>
                            </div>

                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(path.movementStartTime, path.movementEndTime)}
                              </span>
                              <span>{path.waypoints?.length || 0} points</span>
                              {path.distanceFromFarm != null && (
                                <span>{path.distanceFromFarm}m from center</span>
                              )}
                            </div>

                            {path.isStraying && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Animal has strayed outside the farm boundary
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Legend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Legend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {Object.entries(SPECIES_COLORS).map(([species, color]) => (
                      <div key={species} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="capitalize">{SPECIES_EMOJIS[species]} {species}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-xs pt-1 border-t">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STRAY_COLOR }} />
                      <span className="text-red-600 dark:text-red-400 font-medium">⚠ Straying animal</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-green-500/10" />
                      <span>Farm boundary</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
