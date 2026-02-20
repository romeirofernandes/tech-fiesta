import { useState, useEffect, useRef } from "react";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { getMapTile } from "@/lib/mapTiles";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Navigation, Phone, Locate, Clock, MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

// Fix React-Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const farmIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const vetIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});



// Helper: fit map bounds to show both farm & vet
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [bounds, map]);
  return null;
}

export default function Emergency() {
  const { mongoUser } = useUser();
  const { theme } = useTheme();

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [nearestVet, setNearestVet] = useState(null);
  const [routePoints, setRoutePoints] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [farmLatLng, setFarmLatLng] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [error, setError] = useState("");

  const isDark = theme === "dark";
  const { url: tileUrl, attribution: tileAttribution } = getMapTile(theme);

  // ── Fetch farms on mount ──
  useEffect(() => {
    if (mongoUser?._id) {
      fetchFarms();
    } else {
      // mongoUser not yet loaded — wait, or if truly null stop loading
      const timer = setTimeout(() => setPageLoading(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [mongoUser]);

  const fetchFarms = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const res = await axios.get(`${base}/api/farms`, {
        params: { farmerId: mongoUser._id },
      });
      setFarms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching farms:", err);
    } finally {
      setPageLoading(false);
    }
  };

  // ── Resolve farm location to { lat, lon } ──
  const resolveCoords = async (farm) => {
    // 1. Try parsing stored coordinates object
    try {
      if (farm.coordinates) {
        const parsed =
          typeof farm.coordinates === "string"
            ? JSON.parse(farm.coordinates)
            : farm.coordinates;
        if (parsed.lat && parsed.lng)
          return { lat: Number(parsed.lat), lon: Number(parsed.lng) };
        if (parsed.latitude && parsed.longitude)
          return { lat: Number(parsed.latitude), lon: Number(parsed.longitude) };
      }
    } catch (_) {}

    // 2. Try parsing "lat,lng" from location string
    if (farm.location) {
      const parts = farm.location.split(",").map((c) => parseFloat(c.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { lat: parts[0], lon: parts[1] };
      }
    }

    // 3. Geocode the location string via Backend
    if (farm.location) {
      try {
        const base = import.meta.env.VITE_API_BASE_URL;
        const url = `${base}/api/emergency/geocode?query=${encodeURIComponent(
          farm.location
        )}`;
        const res = await axios.get(url);
        if (res.data?.results?.length > 0) {
          const pos = res.data.results[0].position;
          return { lat: pos.lat, lon: pos.lon };
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }

    return null;
  };

  // ── Main action: find nearest vet ──
  const handleFindVet = async () => {
    setError("");
    setNearestVet(null);
    setRoutePoints(null);
    setRouteSummary(null);
    setFarmLatLng(null);
    setMapBounds(null);

    if (!selectedFarmId) {
      setError("Please select a farm first.");
      return;
    }

    const farm = farms.find((f) => f._id === selectedFarmId);
    if (!farm) {
      setError("Selected farm not found.");
      return;
    }

    setSearching(true);

    try {
      // Step 1 — Resolve farm coordinates
      const coords = await resolveCoords(farm);
      if (!coords) {
        setError(
          `Could not determine coordinates for "${farm.name}". Make sure the farm location is a valid address or coordinates.`
        );
        setSearching(false);
        return;
      }

      setFarmLatLng(coords);

      // Step 2 — Search for nearest vet using Backend
      const base = import.meta.env.VITE_API_BASE_URL;
      const searchUrl = `${base}/api/emergency/find-vet?lat=${coords.lat}&lon=${coords.lon}&radius=100000&limit=5`;
      const searchRes = await axios.get(searchUrl);
      let results = searchRes.data?.results;

      if (!results || results.length === 0) {
        setError("No veterinarians found within 100 km of this farm.");
        setSearching(false);
        return;
      }

      const vet = results[0];
      const vetLoc = { lat: vet.position.lat, lon: vet.position.lon };

      setNearestVet({
        name: vet.poi?.name || "Veterinarian",
        address: vet.address?.freeformAddress || "Address not available",
        phone: vet.poi?.phone || "Not available",
        location: vetLoc,
        distance: vet.dist ? (vet.dist / 1000).toFixed(1) : "—",
      });

      // Step 3 — Calculate route
      const routeUrl = `${base}/api/emergency/route?start=${coords.lat},${coords.lon}&end=${vetLoc.lat},${vetLoc.lon}`;
      const routeRes = await axios.get(routeUrl);
      const route = routeRes.data?.routes?.[0];

      if (route) {
        const points = route.legs[0].points.map((p) => [p.latitude, p.longitude]);
        setRoutePoints(points);

        const summary = route.summary;
        setRouteSummary({
          distanceKm: (summary.lengthInMeters / 1000).toFixed(1),
          timeMin: Math.ceil(summary.travelTimeInSeconds / 60),
        });
      }

      // Step 4 — Fit map to bounds
      const bounds = L.latLngBounds(
        [coords.lat, coords.lon],
        [vetLoc.lat, vetLoc.lon]
      );
      setMapBounds(bounds);
    } catch (err) {
      console.error("Emergency search error:", err);
      setError("Something went wrong while searching. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // Derive data for selected farm marker
  const selectedFarm = farms.find((f) => f._id === selectedFarmId);

  return (
    <Layout loading={pageLoading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-destructive flex items-center gap-2">
            <AlertCircle className="h-8 w-8" /> Emergency Vet Finder
          </h1>
          <p className="text-muted-foreground mt-1">
            Locate the nearest veterinarian for your farm animals instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Panel: Controls ── */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Farm</CardTitle>
              <CardDescription>
                Choose the affected farm to find the nearest vet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {farms.length > 0 ? (
                <div className="space-y-2">
                  <Label>Farm</Label>
                  <Select
                    value={selectedFarmId}
                    onValueChange={(v) => {
                      setSelectedFarmId(v);
                      setError("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a farm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map((farm) => (
                        <SelectItem key={farm._id} value={farm._id}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No farms found. Add a farm first.
                </div>
              )}

              <Button
                variant="destructive"
                className="w-full h-12 text-base font-semibold gap-2"
                onClick={handleFindVet}
                disabled={!selectedFarmId || searching}
              >
                {searching ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Locate className="h-5 w-5" />
                    Find Nearest Vet
                  </>
                )}
              </Button>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  {error}
                </p>
              )}

              {/* Vet Result Card */}
              {nearestVet && (
                <div className="p-4 border rounded-lg bg-card shadow-sm space-y-3 animate-in slide-in-from-bottom-2">
                  <h3 className="font-bold text-base flex items-center gap-2 text-primary">
                    <Navigation className="h-4 w-4" /> Nearest Vet Found
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-foreground">
                      {nearestVet.name}
                    </p>
                    <p className="text-muted-foreground">{nearestVet.address}</p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={
                          nearestVet.phone !== "Not available"
                            ? "text-blue-600 dark:text-blue-400 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {nearestVet.phone}
                      </span>
                    </p>

                    {/* Distance & ETA */}
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          Distance
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {routeSummary?.distanceKm || nearestVet.distance} km
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          ETA
                        </p>
                        <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4" />
                          {routeSummary ? `${routeSummary.timeMin} min` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Right Panel: Map ── */}
          <Card className="lg:col-span-2 overflow-hidden border-2 border-muted">
            <div className="h-150 w-full relative">
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
              >
                <TileLayer
                  url={tileUrl}
                  attribution={tileAttribution}
                  maxZoom={20}
                />

                {mapBounds && <FitBounds bounds={mapBounds} />}

                {/* Farm Marker */}
                {farmLatLng && selectedFarm && (
                  <Marker
                    position={[farmLatLng.lat, farmLatLng.lon]}
                    icon={farmIcon}
                  >
                    <Popup>
                      <b>{selectedFarm.name}</b>
                      <br />
                      Your Farm
                    </Popup>
                  </Marker>
                )}

                {/* Vet Marker */}
                {nearestVet && (
                  <Marker
                    position={[
                      nearestVet.location.lat,
                      nearestVet.location.lon,
                    ]}
                    icon={vetIcon}
                  >
                    <Popup>
                      <b>{nearestVet.name}</b>
                      <br />
                      {nearestVet.address}
                    </Popup>
                  </Marker>
                )}

                {/* Route Line */}
                {routePoints && (
                  <Polyline
                    positions={routePoints}
                    pathOptions={{
                      color: "#3b82f6",
                      weight: 5,
                      opacity: 0.8,
                    }}
                  />
                )}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-md p-3 rounded-lg shadow-md z-400 text-xs space-y-1.5 border">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  <span>Your Farm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span>Veterinarian</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-blue-500 inline-block rounded" />
                  <span>Route</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
