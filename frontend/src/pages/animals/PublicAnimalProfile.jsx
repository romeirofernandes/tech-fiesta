import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Thermometer,
  Droplets,
  Heart,
  Syringe,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  User,
  Calendar,
  Dna,
} from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { getSpeciesIcon } from "@/lib/animalIcons";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const EVENT_TYPE_STYLES = {
  administered: { bg: "bg-green-100 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400", icon: CheckCircle2, label: "Done" },
  scheduled:    { bg: "bg-blue-100 dark:bg-blue-950/30",   text: "text-blue-700 dark:text-blue-400",   icon: Clock,        label: "Scheduled" },
  missed:       { bg: "bg-red-100 dark:bg-red-950/30",     text: "text-red-700 dark:text-red-400",     icon: AlertTriangle, label: "Missed" },
};

export default function PublicAnimalProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicAnimal = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/animals/${id}/public`);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Animal not found");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicAnimal();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading animal profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Animal Not Found</h2>
          <p className="text-muted-foreground">{error || "This animal profile doesn't exist or has been removed."}</p>
        </Card>
      </div>
    );
  }

  const { animal, vaccinationEvents, latestVitals, ownerName } = data;
  const administered = vaccinationEvents.filter(e => e.eventType === "administered");
  const scheduled = vaccinationEvents.filter(e => e.eventType === "scheduled");
  const missed = vaccinationEvents.filter(e => e.eventType === "missed");

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#388E3C] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🐄</span>
            <h1 className="text-xl font-bold tracking-wide">पशु पहचान</h1>
            <span className="text-xs opacity-75 ml-1 uppercase tracking-widest">Verified Profile</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-28 w-28 border-4 border-white/30 shadow-lg">
              <AvatarImage src={animal.imageUrl} alt={animal.name} className="object-contain" />
              <AvatarFallback className="text-5xl bg-white/10">
                {getSpeciesIcon(animal.species, "h-14 w-14 text-white/60")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-3xl font-extrabold tracking-tight">{animal.name}</h2>
              <p className="text-white/70 text-sm font-mono mt-1">RFID: {animal.rfid}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-white/20 text-white border-white/30 capitalize">{animal.species}</Badge>
                <Badge className="bg-white/20 text-white border-white/30 capitalize">{animal.gender}</Badge>
                <Badge className="bg-white/20 text-white border-white/30">{animal.age} {animal.ageUnit}</Badge>
                <Badge className="bg-white/20 text-white border-white/30">{animal.breed}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Info Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Farm Info */}
          {animal.farmId && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Farm</p>
                    <p className="font-bold">{animal.farmId.name}</p>
                    <p className="text-xs text-muted-foreground">{animal.farmId.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Owner */}
          {ownerName && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Owner</p>
                    <p className="font-bold">{ownerName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registered Date */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Registered</p>
                  <p className="font-bold">{format(new Date(animal.createdAt), "dd MMM yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest Vitals */}
        {latestVitals && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Latest Health Reading
              </CardTitle>
              <CardDescription>
                Most recent sensor data from the IoT neckband
                {latestVitals.timestamp && (
                  <span className="ml-1">— {format(new Date(latestVitals.timestamp), "PPp")}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                  <Thermometer className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Temperature</p>
                    <p className="text-2xl font-bold">
                      {latestVitals.temperature != null ? `${parseFloat(latestVitals.temperature).toFixed(1)}°C` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                  <Droplets className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Humidity</p>
                    <p className="text-2xl font-bold">
                      {latestVitals.humidity != null ? `${parseFloat(latestVitals.humidity).toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                  <Heart className="h-8 w-8 text-pink-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Heart Rate</p>
                    <p className="text-2xl font-bold">
                      {(latestVitals.heartRate || latestVitals.heart_rate) ? `${latestVitals.heartRate || latestVitals.heart_rate} BPM` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vaccination Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Vaccination Record
            </CardTitle>
            <CardDescription>Complete vaccination history for this animal</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{administered.length}</p>
                <p className="text-xs text-green-600 dark:text-green-500 font-medium">Completed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{scheduled.length}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 font-medium">Scheduled</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{missed.length}</p>
                <p className="text-xs text-red-600 dark:text-red-500 font-medium">Missed</p>
              </div>
            </div>

            {/* Events list */}
            {vaccinationEvents.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {vaccinationEvents.map((event) => {
                  const style = EVENT_TYPE_STYLES[event.eventType] || EVENT_TYPE_STYLES.scheduled;
                  const StatusIcon = style.icon;
                  return (
                    <div
                      key={event._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg}`}
                    >
                      <StatusIcon className={`h-5 w-5 shrink-0 ${style.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{event.vaccineName}</p>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${style.text}`}>
                            {style.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.date), "dd MMM yyyy")}
                          {event.notes && ` · ${event.notes}`}
                        </p>
                      </div>
                      {event.blockchain?.txHash && (
                        <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] shrink-0">
                          <Dna className="h-3 w-3 mr-1" />
                          Blockchain
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Syringe className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No vaccination records available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-6 border-t">
          <p className="text-sm font-semibold text-primary">🐄 पशु पहचान</p>
          <p className="text-xs text-muted-foreground mt-1">
            Livestock Management System — Verified Animal Profile
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This profile was shared by the animal owner for verification purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
