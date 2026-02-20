import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Pencil,
  Save,
  X,
  Shield,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useUser } from "@/context/UserContext";

const BASE = import.meta.env.VITE_API_BASE_URL;

export default function GeofenceThresholds() {
  const { mongoUser } = useUser();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFarmId, setEditingFarmId] = useState(null);
  const [editRadius, setEditRadius] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchFarms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/api/farms`, {
        params: { farmerId: mongoUser?._id },
      });
      setFarms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch farms:", err);
      toast.error("Could not load farms");
    } finally {
      setLoading(false);
    }
  }, [mongoUser]);

  useEffect(() => {
    if (mongoUser?._id) fetchFarms();
  }, [fetchFarms, mongoUser]);

  const startEditing = (farm) => {
    setEditingFarmId(farm._id);
    setEditRadius(farm.herdWatchRadius?.toString() || "300");
  };

  const cancelEditing = () => {
    setEditingFarmId(null);
    setEditRadius("");
  };

  const handleSave = async (farmId) => {
    const val = parseInt(editRadius);
    if (isNaN(val) || val < 50 || val > 10000) {
      toast.error("Radius must be between 50 and 10,000 meters");
      return;
    }

    setSaving(true);
    try {
      await axios.patch(`${BASE}/api/farms/${farmId}/herd-watch-radius`, {
        herdWatchRadius: val,
      });
      toast.success("Radius updated successfully");
      setEditingFarmId(null);
      setEditRadius("");
      fetchFarms();
    } catch (err) {
      console.error("Failed to update radius:", err);
      toast.error("Could not update radius");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Herd Watch Radius Thresholds</p>
            <p className="text-muted-foreground">
              Set the boundary radius (in meters) for each of your farms. If any
              animal's GPS path goes beyond this radius from the farm center, a
              geofence alert will be triggered. Default: 300m. Range: 50m–10,000m.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Farm cards */}
      {farms.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No farms found. Please create a farm first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {farms.map((farm) => {
            const isEditing = editingFarmId === farm._id;
            const hasCoords = farm.coordinates?.lat != null && farm.coordinates?.lng != null;

            return (
              <Card key={farm._id} className="relative">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {farm.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {farm.location}
                      </p>
                    </div>
                    {hasCoords ? (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Shield className="h-3 w-3" />
                        GPS Set
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        No GPS
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                      Boundary Radius
                    </label>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editRadius}
                          onChange={(e) => setEditRadius(e.target.value)}
                          min={50}
                          max={10000}
                          className="w-32"
                          placeholder="300"
                        />
                        <span className="text-xs text-muted-foreground">meters</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleSave(farm._id)}
                          disabled={saving}
                        >
                          <Save className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold tabular-nums">
                          {farm.herdWatchRadius || 300}
                        </span>
                        <span className="text-sm text-muted-foreground">meters</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 ml-auto"
                          onClick={() => startEditing(farm)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {hasCoords && (
                    <p className="text-[10px] text-muted-foreground">
                      Center: {farm.coordinates.lat.toFixed(4)}, {farm.coordinates.lng.toFixed(4)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
