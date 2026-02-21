import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Loader2, Image as ImageIcon, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/context/ThemeContext";
import { getMapTile } from "@/lib/mapTiles";

function MapController({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.flyTo(coordinates, 14, { animate: true, duration: 1 });
    }
  }, [coordinates, map]);
  return null;
}

export default function EditFarm() {
  const { theme } = useTheme();
  const { url: tileUrl, attribution: tileAttribution } = getMapTile(theme);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef(null);
  const searchTimeout = useRef(null);
  const suggestionsRef = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    imageUrl: "",
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddressSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=in`
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectSuggestion = (item) => {
    const coords = [parseFloat(item.lat), parseFloat(item.lon)];
    setCoordinates(coords);
    setFormData((prev) => ({
      ...prev,
      location: `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`,
    }));
    setSearchQuery(item.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const markerIcon = new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
  });

  useEffect(() => {
    fetchFarm();
  }, [id]);

  const fetchFarm = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/farms/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const farm = response.data;
      setFormData({
        name: farm.name,
        location: farm.location,
        imageUrl: farm.imageUrl,
      });
      setImagePreview(farm.imageUrl);
      
      const match = farm.location.match(/^([-+]?\d{1,2}\.\d+),\s*([-+]?\d{1,3}\.\d+)$/);
      if (match) {
        setCoordinates([parseFloat(match[1]), parseFloat(match[2])]);
      }
      
      setFetching(false);
    } catch (error) {
      toast.error("Could not load farm details. Going back...");
      navigate("/farms");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const submitData = new FormData();

      submitData.append("name", formData.name);
      submitData.append("location", formData.location);

      if (imageFile) {
        submitData.append("image", imageFile);
      }

      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/farms/${id}`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("Farm updated!");
      navigate(`/farms/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update farm. Try again.");
    } finally {
      setLoading(false);
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const coords = [e.latlng.lat, e.latlng.lng];
        setCoordinates(coords);
        setFormData((prev) => ({
          ...prev,
          location: `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`,
        }));
      },
    });
    return coordinates ? <Marker position={coordinates} icon={markerIcon} /> : null;
  }

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">

        <Card>
          <CardHeader>
            <CardTitle>Update Farm Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="relative h-48 w-full bg-muted rounded-lg overflow-hidden border-4 border-primary/20 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Farm Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Your Farm Location *</Label>

                {/* Address search */}
                <div className="relative" ref={suggestionsRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
                    )}
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleAddressSearch(e.target.value)}
                      placeholder="Search address or village name…"
                      className="pl-9"
                    />
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-[9999] mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {suggestions.map((item) => (
                        <li
                          key={item.place_id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground border-b last:border-b-0"
                          onMouseDown={() => selectSuggestion(item)}
                        >
                          <span className="font-medium">
                            {item.address?.village || item.address?.town || item.address?.city || item.address?.county || item.name}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">{item.display_name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">Or tap directly on the map to pin your location</p>

                <div className="rounded-lg overflow-hidden border" style={{ height: 300 }}>
                  <MapContainer
                    center={coordinates || [20.5937, 78.9629]}
                    zoom={coordinates ? 13 : 5}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution={tileAttribution}
                      url={tileUrl}
                      maxZoom={20}
                    />
                    <MapController coordinates={coordinates} />
                    <LocationMarker />
                  </MapContainer>
                </div>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="Latitude, Longitude"
                  readOnly
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/farms/${id}`)}
                >
                  Go Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}