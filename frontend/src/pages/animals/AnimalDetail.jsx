import { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Edit2, MapPin, Plus, Thermometer, Droplets, Heart, Activity, RefreshCw, Loader2, Share2, Copy, Check, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate, useParams } from "react-router-dom";
import { getSpeciesIcon } from "@/lib/animalIcons";
import { toast } from "sonner";
import axios from "axios";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { EditVaccinationEventDialog } from "@/components/EditVaccinationEventDialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { VaccinationCalendarViews } from "@/components/VaccinationCalendarViews";
import { useIotPolling } from "@/hooks/useIotPolling";

const TODAY = Date.now();
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const TIME_RANGES = {
  "1h":  { label: "1 Hour",   minutes: 60 },
  "6h":  { label: "6 Hours",  minutes: 360 },
  "24h": { label: "24 Hours", minutes: 1440 },
  "7d":  { label: "7 Days",   minutes: 10080 },
  "all": { label: "All Data", minutes: Infinity },
  "tail": { label: "Last Entry", minutes: -1 },
};

export default function AnimalDetail() {
  const [animal, setAnimal] = useState(null);
  const [vaccinationEvents, setVaccinationEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingVaccinations, setRefreshingVaccinations] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogMode, setEditDialogMode] = useState("edit"); // "edit" or "add"
  const [vaccinationSchedules, setVaccinationSchedules] = useState([]);
  const [reportDeathOpen, setReportDeathOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(TODAY));
  const [view, setView] = useState("list"); // list, 2col, month, week
  const [timeRange, setTimeRange] = useState(() => {
    return localStorage.getItem("animalDetailTimeRange") || "24h";
  });

  // Save timeRange to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem("animalDetailTimeRange", timeRange);
  }, [timeRange]);

  const navigate = useNavigate();
  const { id } = useParams();

  // IoT polling for animal vital signs
  const { 
    data: pollingData, 
    latestReading: polledLatestReading, 
    status, 
    lastUpdated,
    refetch 
  } = useIotPolling(API_BASE, {
    pollInterval: 1000, // Poll every 1 second
    rfid: null,
    limit: 60,
    enabled: !!animal?.rfid,
    onNewData: useCallback((newData) => {
      if (newData.length > 0) {
        console.log(`[AnimalDetail] Received ${newData.length} new readings for ${animal?.rfid}`);
      }
    }, [animal?.rfid])
  });

  // Transform polling data for charts (filter by time range)
  const historicalData = useMemo(() => {
    if (!pollingData || pollingData.length === 0) return [];

    // "tail" = last 5 entries
    if (timeRange === "tail") {
      const sorted = [...pollingData].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      const lastFive = sorted.slice(0, 5).reverse(); // Get last 5, then reverse to chronological order
      if (lastFive.length === 0) return [];
      return lastFive.map(last => ({
        time: format(new Date(last.timestamp), "HH:mm:ss"),
        timestamp: new Date(last.timestamp).getTime(),
        temperature: last.temperature != null ? parseFloat(last.temperature) : 0,
        humidity: last.humidity != null ? parseFloat(last.humidity) : 0,
        heart_rate: last.heartRate ?? last.heart_rate ?? 0,
      }));
    }

    const filteredAndSorted = pollingData
      .filter((reading) => {
        if (timeRange === "all") return true;
        const cutoffTime = Date.now() - TIME_RANGES[timeRange].minutes * 60 * 1000;
        return new Date(reading.timestamp).getTime() > cutoffTime;
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Sort chronologically (oldest to newest)
      .map((reading) => ({
        time: format(
          new Date(reading.timestamp),
          timeRange === "7d" || timeRange === "all" ? "MM/dd HH:mm" : "HH:mm:ss"
        ),
        timestamp: new Date(reading.timestamp).getTime(),
        temperature: reading.temperature != null ? parseFloat(reading.temperature) : 0,
        humidity: reading.humidity != null ? parseFloat(reading.humidity) : 0,
        heart_rate: reading.heartRate ?? reading.heart_rate ?? 0,
      }));
      
    return filteredAndSorted;
  }, [pollingData, timeRange]);

  // Get latest reading with normalized field names
  const latestReading = useMemo(() => {
    if (!polledLatestReading) return null;
    return {
      ...polledLatestReading,
      heart_rate: polledLatestReading.heartRate || polledLatestReading.heart_rate,
    };
  }, [polledLatestReading]);

  useEffect(() => {
    fetchAnimalDetails();
  }, [id]);

  useEffect(() => {
    if (animal?.species) {
      fetchVaccinationSchedules();
    }
  }, [animal?.species, animal?.gender]);

  const fetchVaccinationSchedules = async () => {
    try {
      const params = new URLSearchParams({ species: animal.species });
      if (animal.gender) params.append('gender', animal.gender);
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-schedules?${params}`
      );
      setVaccinationSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch vaccination schedules');
    }
  };

  const fetchAnimalDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAnimal(response.data.animal);
      setVaccinationEvents(response.data.vaccinationEvents);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch animal details");
      setLoading(false);
    }
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setEditDialogMode("add");
    setEditDialogOpen(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEditDialogMode("edit");
    setEditDialogOpen(true);
  };

  const handleRefreshVaccinations = async () => {
    setRefreshingVaccinations(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals/${id}/regenerate-vaccinations`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVaccinationEvents(response.data.vaccinationEvents || []);
      toast.success(response.data.message || "Vaccination schedule refreshed!");
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Failed to refresh vaccination schedule");
    } finally {
      setRefreshingVaccinations(false);
    }
  };

  const handleResolveEvent = async (event) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events/${event._id}/resolve`
      );
      toast.success("Vaccination marked as done!");
      fetchAnimalDetails();
    } catch (error) {
      toast.error("Failed to resolve vaccination event");
    }
  };



  const getAnimalName = () => animal?.name || "Unknown";

  const shareUrl = `${window.location.origin}/animal/${id}/share`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Calendar helpers
  const eventsByDate = useMemo(() => {
    const map = {};
    vaccinationEvents.forEach((event) => {
      const dateKey = format(new Date(event.date), "yyyy-MM-dd");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    return map;
  }, [vaccinationEvents]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!animal) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold mb-2">Animal not found</h2>
          <Button onClick={() => navigate("/animals")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Animals
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex gap-2">
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-green-700" />
                    Share {animal?.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="bg-white p-4 rounded-xl border-2 border-green-100 shadow-sm">
                    <QRCodeSVG
                      value={shareUrl}
                      size={220}
                      level="H"
                      includeMargin={true}
                      fgColor="#1B5E20"
                      imageSettings={{
                        src: "/logo.png",
                        height: 30,
                        width: 30,
                        excavate: true,
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code to view <strong>{animal?.name}</strong>'s public profile.
                    Anyone with this link can view the animal's details without logging in.
                  </p>
                  <div className="flex w-full items-center gap-2">
                    <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm truncate">
                      {shareUrl}
                    </div>
                    <Button size="sm" variant="outline" onClick={handleCopyLink}>
                      {linkCopied ? (
                        <><Check className="mr-1 h-4 w-4 text-green-600" /> Copied</>
                      ) : (
                        <><Copy className="mr-1 h-4 w-4" /> Copy</>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
                variant="destructive"
                onClick={() => setReportDeathOpen(true)}
            >
                Report Death
            </Button>
            <Button onClick={() => navigate(`/animals/${id}/edit`)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Animal
            </Button>
          </div>
        </div>

        <AlertDialog open={reportDeathOpen} onOpenChange={setReportDeathOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Passage of a Life</AlertDialogTitle>
                    <CardDescription className="text-base mt-2">
                        It is with a heavy heart that we process this request. 
                        Are you sure you want to report the passing of <strong>{animal?.name}</strong>?
                    </CardDescription>
                    <CardDescription className="mt-2">
                        This action acknowledges the loss and will:
                        <ul className="list-disc ml-5 mt-1 space-y-1">
                            <li>Move {animal?.name} to your memorial records</li>
                            <li>Cancel all upcoming vaccination schedules</li>
                            <li>Remove any active marketplace listings</li>
                            <li>Close all active alerts</li>
                        </ul>
                    </CardDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={async () => {
                            try {
                                const token = localStorage.getItem("token"); // Assuming auth
                                await axios.post(
                                    `${import.meta.env.VITE_API_BASE_URL}/api/animals/${id}/death`,
                                    { causeOfDeath: "Reported by user" },
                                    { headers: { Authorization: `Bearer ${token}` } } // Add auth header if needed for consistency, relying on axios interceptors mostly? Code used explicit header in fetchAnimalDetails.
                                );
                                toast.success("Death reported. May they rest in peace.");
                                navigate("/animals");
                            } catch (error) {
                                toast.error("Failed to report death");
                                console.error(error);
                            }
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Confirm Passage
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Animal Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={animal.imageUrl} alt={animal.name} className="object-contain" />
                <AvatarFallback className="text-6xl flex items-center justify-center">
                  {getSpeciesIcon(animal.species, "h-16 w-16 text-muted-foreground")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold">{animal.name}</h1>
                  <p className="text-muted-foreground">RFID: {animal.rfid}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {animal.species}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {animal.gender}
                  </Badge>
                  <Badge variant="outline">
                    {animal.age} {animal.ageUnit}
                  </Badge>
                  <Badge variant="outline">{animal.breed}</Badge>
                </div>
                {animal.farmId && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={animal.farmId.imageUrl} />
                      <AvatarFallback>🏡</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{animal.farmId.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {animal.farmId.location}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IoT Vital Signs Monitoring */}
        {animal.rfid && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Live Vitals
                  </CardTitle>
                  <CardDescription>
                    Real-time sensor data from RFID {animal.rfid} • Status: <Badge variant={status === "connected" ? "default" : status === "error" ? "destructive" : "secondary"} className="ml-1 text-xs">{status}</Badge>
                  </CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIME_RANGES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Latest Readings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Thermometer className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-xl font-bold">
                        {latestReading?.temperature != null
                          ? `${parseFloat(latestReading.temperature).toFixed(1)}°C`
                          : "0°C"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Droplets className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Humidity</p>
                      <p className="text-xl font-bold">
                        {latestReading?.humidity != null
                          ? `${parseFloat(latestReading.humidity).toFixed(1)}%`
                          : "0%"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Heart className="h-8 w-8 text-pink-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Heart Rate</p>
                      <p className="text-xl font-bold">
                        {latestReading?.heart_rate != null
                          ? `${latestReading.heart_rate} bpm`
                          : "0 bpm"}
                      </p>
                    </div>
                  </div>
                  {latestReading?.timestamp && (
                    <div className="sm:col-span-3 text-xs text-muted-foreground mt-1">
                      Last reading: {format(new Date(latestReading.timestamp), "PPpp")}
                    </div>
                  )}
                </div>

              {/* Charts */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                  {/* Temperature Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Temperature</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historicalData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="time" 
                              tick={{ fontSize: 10 }} 
                              tickLine={false} 
                              interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}°C`} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} name="Temp (°C)" isAnimationActive={true} animationDuration={500} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Humidity Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Humidity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historicalData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="time" 
                              tick={{ fontSize: 10 }} 
                              tickLine={false} 
                              interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={false} name="Humidity (%)" isAnimationActive={true} animationDuration={500} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Heart Rate Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Heart Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historicalData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="time" 
                              tick={{ fontSize: 10 }} 
                              tickLine={false} 
                              interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="heart_rate" stroke="#ec4899" strokeWidth={2} dot={false} name="HR (bpm)" isAnimationActive={true} animationDuration={500} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
            </CardContent>
          </Card>
        )}

        <VaccinationCalendarViews
          today={TODAY}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          view={view}
          setView={setView}
          loading={false}
          vaccinationEvents={vaccinationEvents}
          eventsByDate={eventsByDate}
          calendarDays={calendarDays}
          getAnimalName={getAnimalName}
          onEditEvent={handleEditEvent}
          onResolveEvent={handleResolveEvent}
          extraControls={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshVaccinations}
                disabled={refreshingVaccinations}
              >
                {refreshingVaccinations ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Schedule
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddEvent}>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </div>
          }
        />



        <EditVaccinationEventDialog
          event={editingEvent}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchAnimalDetails}
          animalId={animal._id}
          mode={editDialogMode}
          suggestedVaccines={vaccinationSchedules}
        />
      </div>
    </Layout>
  );
}