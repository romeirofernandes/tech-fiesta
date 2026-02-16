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
import { ArrowLeft, Edit2, MapPin, Plus, Thermometer, Droplets, Heart, Activity } from "lucide-react";
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
  "1h":  { label: "1 Hour",  minutes: 60 },
  "6h":  { label: "6 Hours", minutes: 360 },
  "24h": { label: "24 Hours", minutes: 1440 },
  "7d":  { label: "7 Days",  minutes: 10080 },
  "all": { label: "All Data", minutes: Infinity },
};

export default function AnimalDetail() {
  const [animal, setAnimal] = useState(null);
  const [vaccinationEvents, setVaccinationEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogMode, setEditDialogMode] = useState("edit"); // "edit" or "add"
  const [vaccinationSchedules, setVaccinationSchedules] = useState([]);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [reportDeathOpen, setReportDeathOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(TODAY));
  const [view, setView] = useState("list"); // list, 2col, month, week
  const [timeRange, setTimeRange] = useState("24h");
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
    pollInterval: 5000,
    rfid: animal?.rfid || null,
    limit: 500,
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
    
    return pollingData
      .filter((reading) => {
        if (timeRange === "all") return true;
        const cutoffTime = Date.now() - TIME_RANGES[timeRange].minutes * 60 * 1000;
        return new Date(reading.timestamp).getTime() > cutoffTime;
      })
      .map((reading) => ({
        time: format(
          new Date(reading.timestamp),
          timeRange === "7d" || timeRange === "all" ? "MM/dd HH:mm" : "HH:mm"
        ),
        timestamp: new Date(reading.timestamp).getTime(),
        temperature: reading.temperature ? parseFloat(reading.temperature) : null,
        humidity: reading.humidity ? parseFloat(reading.humidity) : null,
        heart_rate: reading.heartRate || reading.heart_rate,
      }));
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

  const handleDeleteEvent = async () => {
    if (!deleteEvent) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events/${deleteEvent._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Vaccination event deleted");
      setDeleteEvent(null);
      fetchAnimalDetails();
    } catch (error) {
      toast.error("Failed to delete event");
      setDeleteEvent(null);
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
              {latestReading && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Thermometer className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-xl font-bold">{latestReading.temperature ? `${parseFloat(latestReading.temperature).toFixed(1)}°C` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Droplets className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Humidity</p>
                      <p className="text-xl font-bold">{latestReading.humidity ? `${parseFloat(latestReading.humidity).toFixed(1)}%` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Heart className="h-8 w-8 text-pink-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Heart Rate</p>
                      <p className="text-xl font-bold">{latestReading.heart_rate ? `${latestReading.heart_rate} bpm` : "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts */}
              {historicalData.length > 0 ? (
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
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}°C`} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} name="Temp (°C)" />
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
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={false} name="Humidity (%)" />
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
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="heart_rate" stroke="#ec4899" strokeWidth={2} dot={false} name="HR (bpm)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">{status === "error" ? "Failed to load sensor data" : "No sensor data available yet"}</p>
                </div>
              )}
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
          onDeleteEvent={setDeleteEvent}
          onResolveEvent={handleResolveEvent}
          extraControls={
            <Button variant="outline" size="sm" onClick={handleAddEvent}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          }
        />

        {/* Delete Vaccination Event Dialog */}
        <AlertDialog open={!!deleteEvent} onOpenChange={open => !open && setDeleteEvent(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this vaccination event?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteEvent(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEvent}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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