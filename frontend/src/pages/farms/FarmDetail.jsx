import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit2, MapPin, Image as ImageIcon, Beef } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/context/ThemeContext";
import { getMapTile } from "@/lib/mapTiles";

export default function FarmDetail() {
  const { theme } = useTheme();
  const { url: tileUrl, attribution: tileAttribution } = getMapTile(theme);
  const [farm, setFarm] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  const markerIcon = new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
  });

  useEffect(() => {
    fetchFarmDetails();
  }, [id]);

  const fetchFarmDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const [farmResponse, animalsResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/farms/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/animals?farmId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setFarm(farmResponse.data);
      setAnimals(Array.isArray(animalsResponse.data) ? animalsResponse.data : []);
      setLoading(false);
    } catch (error) {
      toast.error("Could not load farm details. Please try again.");
      setLoading(false);
    }
  };

  const parseCoordinates = (location) => {
    const match = location.match(/^([-+]?\d{1,2}\.\d+),\s*([-+]?\d{1,3}\.\d+)$/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!farm) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <MapPin className="h-12 w-12 mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Farm not found</h2>
          <Button onClick={() => navigate("/farms")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Farms
          </Button>
        </div>
      </Layout>
    );
  }

  const coordinates = parseCoordinates(farm.location);

  return (
    <Layout>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{farm.name}</h1>
          <Button onClick={() => navigate(`/farms/${id}/edit`)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Update Farm
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="relative h-64 bg-muted">
              {farm.imageUrl ? (
                <img
                  src={farm.imageUrl}
                  alt={farm.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h1 className="text-3xl font-bold">{farm.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{farm.location}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {coordinates && (
          <Card>
            <CardHeader>
              <CardTitle>Farm on Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border" style={{ height: 400 }}>
                <MapContainer
                  center={coordinates}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution={tileAttribution}
                    url={tileUrl}
                    maxZoom={20}
                  />
                  <Marker position={coordinates} icon={markerIcon} />
                  {farm.herdWatchRadius && (
                    <Circle
                      center={coordinates}
                      radius={farm.herdWatchRadius}
                      pathOptions={{
                        color: 'hsl(142, 76%, 36%)',
                        fillColor: 'hsl(142, 76%, 36%)',
                        fillOpacity: 0.12,
                        weight: 2,
                        dashArray: '6 4',
                      }}
                    />
                  )}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Animals at This Farm</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/animals/create")}
            >
              <Beef className="mr-2 h-4 w-4" />
              Add Animal Here
            </Button>
          </CardHeader>
          <CardContent>
            {animals.length === 0 ? (
              <div className="text-center py-12">
                <Beef className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No animals at this farm yet. Add one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {animals.map((animal) => (
                  <div
                    key={animal._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/animals/${animal._id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Beef className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{animal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {animal.species} • {animal.breed}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {animal.gender}
                    </Badge>
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