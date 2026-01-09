import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import { MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

export default function FarmDistributionMap() {
  const [farms, setFarms] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [farmsRes, animalsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/farms`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/animals`)
      ]);

      setFarms(farmsRes.data || []);
      setAnimals(animalsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-4 text-muted-foreground">Loading map data...</div>;

  // Process farm locations
  const farmMarkers = farms.map(farm => {
    const [lat, lng] = farm.location.split(',').map(coord => parseFloat(coord.trim()));
    const farmAnimals = animals.filter(a => a.farmId === farm._id);
    
    return {
      ...farm,
      lat,
      lng,
      animalCount: farmAnimals.length,
      healthyCount: farmAnimals.filter(a => a.healthStatus === 'healthy').length,
      healthRate: farmAnimals.length > 0 
        ? Math.round((farmAnimals.filter(a => a.healthStatus === 'healthy').length / farmAnimals.length) * 100)
        : 0
    };
  });

  // Calculate center point based on all farms
  const centerLat = farmMarkers.reduce((sum, farm) => sum + farm.lat, 0) / farmMarkers.length || 19.5;
  const centerLng = farmMarkers.reduce((sum, farm) => sum + farm.lng, 0) / farmMarkers.length || 73;

  // Calculate density for heatmap effect
  const maxAnimals = Math.max(...farmMarkers.map(f => f.animalCount), 1);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Farm Distribution & Density
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] relative">
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
            className="rounded-b-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {farmMarkers.map((farm) => (
              <div key={farm._id}>
                {/* Heatmap circle based on animal density */}
                <CircleMarker
                  center={[farm.lat, farm.lng]}
                  radius={20 + (farm.animalCount / maxAnimals) * 30}
                  fillColor={
                    farm.healthRate >= 80 ? "hsl(var(--primary))" : 
                    farm.healthRate >= 60 ? "hsl(var(--chart-5))" : 
                    "hsl(var(--destructive))"
                  }
                  fillOpacity={0.3}
                  stroke={false}
                />
                
                {/* Marker */}
                <Marker position={[farm.lat, farm.lng]}>
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-base">{farm.name}</h3>
                      <div className="space-y-1 mt-2 text-sm">
                        <p>
                          <span className="text-muted-foreground">Animals:</span>
                          <span className="ml-1 font-medium">{farm.animalCount}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Health Rate:</span>
                          <span className={`ml-1 font-medium ${
                            farm.healthRate >= 80 ? 'text-green-600' : 
                            farm.healthRate >= 60 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {farm.healthRate}%
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {farm.location}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </div>
            ))}
          </MapContainer>
        </div>
        
        {/* Legend */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 opacity-30"></div>
                <span className="text-muted-foreground">Healthy (80%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500 opacity-30"></div>
                <span className="text-muted-foreground">Fair (60-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 opacity-30"></div>
                <span className="text-muted-foreground">Poor (60%)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Circle size indicates animal density
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}