import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const EVENT_TYPE_STYLES = {
  administered: { bg: "bg-chart-1/10", text: "text-chart-1", icon: CheckCircle2, label: "Done" },
  scheduled:    { bg: "bg-chart-2/10", text: "text-chart-2", icon: Clock, label: "Scheduled" },
  missed:       { bg: "bg-destructive/10", text: "text-destructive", icon: AlertTriangle, label: "Missed" },
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

  // All hooks must run unconditionally before any early returns
  const { animal, vaccinationEvents = [], latestVitals, vitalsHistory = [], ownerName } = data || {};

  const administered = useMemo(() => vaccinationEvents.filter(e => e.eventType === "administered"), [vaccinationEvents]);
  const scheduled    = useMemo(() => vaccinationEvents.filter(e => e.eventType === "scheduled"),    [vaccinationEvents]);
  const missed       = useMemo(() => vaccinationEvents.filter(e => e.eventType === "missed"),       [vaccinationEvents]);

  const chartData = useMemo(() => {
    if (!Array.isArray(vitalsHistory) || vitalsHistory.length === 0) return [];
    return vitalsHistory
      .filter((r) => r?.timestamp)
      .map((r) => ({
        time: format(new Date(r.timestamp), "HH:mm"),
        timestamp: new Date(r.timestamp).getTime(),
        temperature: r.temperature != null ? Number(r.temperature) : null,
        humidity: r.humidity != null ? Number(r.humidity) : null,
        heartRate: r.heartRate != null ? Number(r.heartRate) : null,
      }));
  }, [vitalsHistory]);

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

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">पशु पहचान</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">Public profile</Badge>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/">Open main website</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Animal summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
              <Avatar className="h-24 w-24 border">
                <AvatarImage src={animal.imageUrl} alt={animal.name} className="object-contain" />
                <AvatarFallback className="text-4xl">
                  {getSpeciesIcon(animal.species, "h-12 w-12 text-muted-foreground")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{animal.name}</h1>
                    <p className="text-sm text-muted-foreground font-mono mt-1">RFID: {animal.rfid}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="capitalize">{animal.species}</Badge>
                    <Badge variant="outline" className="capitalize">{animal.gender}</Badge>
                    <Badge variant="outline">{animal.age} {animal.ageUnit}</Badge>
                    <Badge variant="outline">{animal.breed}</Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 mt-5">
                  {animal.farmId && (
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Farm</p>
                        <p className="font-semibold truncate">{animal.farmId.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{animal.farmId.location}</p>
                      </div>
                    </div>
                  )}

                  {ownerName && (
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Owner</p>
                        <p className="font-semibold truncate">{ownerName}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Registered</p>
                      <p className="font-semibold truncate">{format(new Date(animal.createdAt), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vitals + Graph */}
        {(latestVitals || chartData.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-chart-1" />
                Health & Vitals
              </CardTitle>
              <CardDescription>
                Latest reading and trend graph from the IoT neckband
                {latestVitals?.timestamp && (
                  <span className="ml-1">— {format(new Date(latestVitals.timestamp), "PPp")}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {latestVitals && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                    <Thermometer className="h-8 w-8 text-chart-3" />
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-2xl font-bold">
                        {latestVitals.temperature != null ? `${parseFloat(latestVitals.temperature).toFixed(1)}°C` : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                    <Droplets className="h-8 w-8 text-chart-2" />
                    <div>
                      <p className="text-xs text-muted-foreground">Humidity</p>
                      <p className="text-2xl font-bold">
                        {latestVitals.humidity != null ? `${parseFloat(latestVitals.humidity).toFixed(1)}%` : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                    <Heart className="h-8 w-8 text-chart-1" />
                    <div>
                      <p className="text-xs text-muted-foreground">Heart Rate</p>
                      <p className="text-2xl font-bold">
                        {latestVitals.heartRate ? `${latestVitals.heartRate} BPM` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {chartData.length > 1 ? (
                <div className="h-56 w-full rounded-xl border bg-card p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                      <YAxis tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} width={35} />
                      <RechartsTooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          color: "var(--popover-foreground)",
                          borderRadius: 8,
                        }}
                        labelFormatter={(_, payload) => {
                          const ts = payload?.[0]?.payload?.timestamp;
                          return ts ? format(new Date(ts), "PPp") : "";
                        }}
                      />
                      <Line type="monotone" dataKey="temperature" name="Temp (°C)" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="heartRate" name="Heart (BPM)" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Not enough vitals history available yet to draw a graph.
                </div>
              )}
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
              <div className="text-center p-3 rounded-lg bg-chart-1/10 border border-border">
                <p className="text-2xl font-bold text-chart-1">{administered.length}</p>
                <p className="text-xs text-chart-1 font-medium">Completed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-chart-2/10 border border-border">
                <p className="text-2xl font-bold text-chart-2">{scheduled.length}</p>
                <p className="text-xs text-chart-2 font-medium">Scheduled</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10 border border-border">
                <p className="text-2xl font-bold text-destructive">{missed.length}</p>
                <p className="text-xs text-destructive font-medium">Missed</p>
              </div>
            </div>

            {/* Events list */}
            {vaccinationEvents.length > 0 ? (
              <div className="space-y-2 max-h-100 overflow-y-auto pr-1">
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
        <div className="text-center py-8 border-t">
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
