import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search, 
  Syringe, 
  ShieldCheck, 
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3x3,
  CalendarDays,
  TrendingUp,
  MapPin,
  Users,
  Activity
} from "lucide-react";
import axios from "axios";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { toast } from "sonner";

const TODAY = new Date();

const EVENT_COLORS = {
  administered: "bg-green-600 text-white",
  completed: "bg-green-600 text-white",
  scheduled: "bg-blue-600 text-white",
  missed: "bg-red-600 text-white",
  estimated: "bg-yellow-600 text-white",
};

const EVENT_DOT_COLORS = {
  administered: "bg-green-500",
  completed: "bg-green-500",
  scheduled: "bg-blue-500",
  missed: "bg-red-500",
  estimated: "bg-yellow-500",
};

export default function VaccinationTracking() {
  const [vaccinations, setVaccinations] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("overview"); // overview, calendar, list
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(TODAY));
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFarm, setFilterFarm] = useState("all");
  const [filterAnimal, setFilterAnimal] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;

      const [vaccinationsRes, animalsRes, farmsRes] = await Promise.all([
        axios.get(`${baseURL}/api/vaccination-events`),
        axios.get(`${baseURL}/api/animals`),
        axios.get(`${baseURL}/api/farms`),
      ]);

      setVaccinations(vaccinationsRes.data || []);
      setAnimals(animalsRes.data || []);
      setFarms(farmsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to fetch vaccination data");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEvent = async (event) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events/${event._id}/resolve`
      );
      toast.success("Vaccination marked as administered!");
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve vaccination event");
    }
  };

  // Calculate metrics
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const upcomingVaccinations = vaccinations.filter(v => {
    const date = new Date(v.date);
    return date > today && date <= nextWeek && v.eventType === 'scheduled';
  });

  const overdueVaccinations = vaccinations.filter(v => {
    const date = new Date(v.date);
    return date < today && (v.eventType === 'scheduled' || v.eventType === 'missed');
  });

  const completedRecently = vaccinations.filter(v => {
    const date = new Date(v.date);
    return date > lastMonth && date <= today && (v.eventType === 'completed' || v.eventType === 'administered');
  });

  const complianceRate = vaccinations.length > 0 
    ? Math.round((completedRecently.length / (completedRecently.length + overdueVaccinations.length || 1)) * 100)
    : 0;

  const vaccineTypes = vaccinations.reduce((acc, v) => {
    if (!acc[v.vaccineName]) {
      acc[v.vaccineName] = { scheduled: 0, completed: 0, overdue: 0 };
    }
    const date = new Date(v.date);
    if (v.eventType === 'completed' || v.eventType === 'administered') {
      acc[v.vaccineName].completed++;
    } else if (date < today) {
      acc[v.vaccineName].overdue++;
    } else {
      acc[v.vaccineName].scheduled++;
    }
    return acc;
  }, {});

  // Apply filters
  const filteredVaccinations = vaccinations.filter(v => {
    const matchesSearch = v.vaccineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.animalId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFarm = filterFarm === "all" || 
                       (v.animalId?.farmId?._id === filterFarm || v.animalId?.farmId === filterFarm);
    
    const matchesAnimal = filterAnimal === "all" || 
                         (v.animalId?._id === filterAnimal || v.animalId === filterAnimal);
    
    const matchesStatus = filterStatus === "all" || v.eventType === filterStatus;

    return matchesSearch && matchesFarm && matchesAnimal && matchesStatus;
  });

  // Group events by date for calendar
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredVaccinations.forEach((event) => {
      const dateKey = format(new Date(event.date), "yyyy-MM-dd");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    return map;
  }, [filteredVaccinations]);

  // Generate calendar days
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

  const getAnimalName = (event) => {
    if (event.animalId && typeof event.animalId === "object") {
      return event.animalId.name;
    }
    const animal = animals.find((a) => a._id === event.animalId);
    return animal ? animal.name : "Unknown";
  };

  const getFarmName = (event) => {
    if (event.animalId && typeof event.animalId === "object" && event.animalId.farmId) {
      if (typeof event.animalId.farmId === "object") {
        return event.animalId.farmId.name;
      }
      const farm = farms.find(f => f._id === event.animalId.farmId);
      return farm ? farm.name : "Unknown";
    }
    return "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Syncing vaccination records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "DUE THIS WEEK", val: upcomingVaccinations.length, icon: Calendar, color: "text-chart-2", bg: "bg-chart-2/10" },
          { label: "OVERDUE", val: overdueVaccinations.length, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "COMPLETED (30D)", val: completedRecently.length, icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
          { label: "COMPLIANCE", val: `${complianceRate}%`, icon: ShieldCheck, color: "text-chart-3", bg: "bg-chart-3/10" },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className={`${item.bg} p-3 rounded-lg`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View Switcher & Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          
          {/* View Toggle */}
          <div className="flex items-center gap-2 border rounded-lg p-0.5">
            <Button 
              variant={view === "overview" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setView("overview")}
            >
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button 
              variant={view === "calendar" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setView("calendar")}
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button 
              variant={view === "list" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search vaccines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
              />
            </div>

            <Select value={filterFarm} onValueChange={setFilterFarm}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Farms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Farms</SelectItem>
                {farms.map((farm) => (
                  <SelectItem key={farm._id} value={farm._id}>
                    {farm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAnimal} onValueChange={setFilterAnimal}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Animals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Animals</SelectItem>
                {animals.map((animal) => (
                  <SelectItem key={animal._id} value={animal._id}>
                    {animal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="administered">Administered</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content based on view */}
      {view === "overview" && (
        <OverviewView
          upcomingVaccinations={filteredVaccinations.filter(v => {
            const date = new Date(v.date);
            return date > today && date <= nextWeek && v.eventType === 'scheduled';
          })}
          overdueVaccinations={filteredVaccinations.filter(v => {
            const date = new Date(v.date);
            return date < today && (v.eventType === 'scheduled' || v.eventType === 'missed');
          })}
          vaccineTypes={vaccineTypes}
          getAnimalName={getAnimalName}
          getFarmName={getFarmName}
          handleResolveEvent={handleResolveEvent}
        />
      )}

      {view === "calendar" && (
        <CalendarView
          calendarDays={calendarDays}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          eventsByDate={eventsByDate}
          getAnimalName={getAnimalName}
          getFarmName={getFarmName}
          handleResolveEvent={handleResolveEvent}
        />
      )}

      {view === "list" && (
        <ListView
          vaccinations={filteredVaccinations}
          getAnimalName={getAnimalName}
          getFarmName={getFarmName}
          handleResolveEvent={handleResolveEvent}
        />
      )}
    </div>
  );
}

/* ======================== OVERVIEW VIEW ======================== */
function OverviewView({ upcomingVaccinations, overdueVaccinations, vaccineTypes, getAnimalName, getFarmName, handleResolveEvent }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Upcoming & Overdue Tables */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Overdue Alert */}
        {overdueVaccinations.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {overdueVaccinations.length} Overdue Vaccination{overdueVaccinations.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  System-wide compliance is at risk. Immediate action required.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Schedule */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-chart-2" />
              Upcoming This Week ({upcomingVaccinations.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border bg-muted font-bold text-[10px] uppercase">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Vaccine</th>
                  <th className="px-6 py-3">Animal</th>
                  <th className="px-6 py-3">Farm</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingVaccinations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground italic">
                      No scheduled events for the coming week
                    </td>
                  </tr>
                ) : (
                  upcomingVaccinations.slice(0, 10).map((v) => (
                    <tr key={v._id} className="hover:bg-accent transition-colors">
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                        {format(new Date(v.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{v.vaccineName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-foreground">{getAnimalName(v)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {v.animalId?.rfid}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{getFarmName(v)}</td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveEvent(v)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue Schedule */}
        {overdueVaccinations.length > 0 && (
          <div className="bg-card border border-destructive/20 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-destructive/20 flex justify-between items-center bg-destructive/5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue Vaccinations ({overdueVaccinations.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border bg-muted font-bold text-[10px] uppercase">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Vaccine</th>
                    <th className="px-6 py-3">Animal</th>
                    <th className="px-6 py-3">Farm</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overdueVaccinations.slice(0, 10).map((v) => (
                    <tr key={v._id} className="hover:bg-accent transition-colors">
                      <td className="px-6 py-4 font-mono text-destructive text-xs">
                        {format(new Date(v.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{v.vaccineName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-foreground">{getAnimalName(v)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {v.animalId?.rfid}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{getFarmName(v)}</td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveEvent(v)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Coverage Stats */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
              <Syringe className="h-3.5 w-3.5" />
              Coverage by Vaccine Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 max-h-150 overflow-y-auto pr-2">
            {Object.entries(vaccineTypes).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No vaccine data</p>
            ) : (
              Object.entries(vaccineTypes).map(([vaccine, stats]) => {
                const total = stats.scheduled + stats.completed + stats.overdue;
                const rate = total > 0 ? Math.round((stats.completed / total) * 100) : 0;
                
                return (
                  <div key={vaccine}>
                    <div className="flex justify-between text-[11px] mb-1.5 font-medium">
                      <span className="text-foreground">{vaccine}</span>
                      <span className={rate > 80 ? "text-primary" : "text-chart-5"}>{rate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${rate > 80 ? 'bg-primary' : 'bg-chart-5'}`} 
                        style={{ width: `${rate}%` }} 
                      />
                    </div>
                    <div className="flex gap-3 mt-2 text-[9px] text-muted-foreground uppercase tracking-tighter font-bold">
                      <span>Done: {stats.completed}</span>
                      <span>Due: {stats.scheduled}</span>
                      <span className={stats.overdue > 0 ? "text-destructive" : ""}>
                        Overdue: {stats.overdue}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ======================== CALENDAR VIEW ======================== */
function CalendarView({ calendarDays, currentMonth, setCurrentMonth, eventsByDate, getAnimalName, getFarmName, handleResolveEvent }) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MAX_VISIBLE_EVENTS = 3;

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(startOfMonth(TODAY))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-xl overflow-hidden bg-card">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isSameDay(day, TODAY);
            const hasOverflow = dayEvents.length > MAX_VISIBLE_EVENTS;

            return (
              <div
                key={idx}
                className={`min-h-32 border-b border-r p-2 transition-colors ${
                  !isCurrentMonth ? "bg-muted/20 text-muted-foreground/50" : "hover:bg-accent/30"
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium inline-flex items-center justify-center ${
                      isCurrentDay
                        ? "bg-primary text-primary-foreground rounded-full w-7 h-7"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                    <Tooltip key={event._id}>
                      <TooltipTrigger asChild>
                        <div
                          className={`text-xs px-2 py-1 rounded truncate cursor-default group relative ${
                            EVENT_COLORS[event.eventType] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span>{event.vaccineName}</span>
                          {handleResolveEvent && (event.eventType === 'scheduled' || event.eventType === 'missed') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleResolveEvent(event); }}
                              className="absolute right-1 top-0 bottom-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                              type="button"
                              title="Mark as Done"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{event.vaccineName}</p>
                          <p className="text-xs opacity-80">{getAnimalName(event)}</p>
                          <p className="text-xs opacity-80">{getFarmName(event)}</p>
                          <p className="text-xs opacity-80">
                            {format(new Date(event.date), "PPP p")}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize border-white/30 text-white"
                          >
                            {event.eventType}
                          </Badge>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {hasOverflow && (
                    <div className="text-[11px] text-muted-foreground px-1">
                      +{dayEvents.length - MAX_VISIBLE_EVENTS} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ======================== LIST VIEW ======================== */
function ListView({ vaccinations, getAnimalName, getFarmName, handleResolveEvent }) {
  const sortedVaccinations = [...vaccinations].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  if (sortedVaccinations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Syringe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No vaccination events found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border bg-muted font-bold text-[10px] uppercase">
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Vaccine</th>
              <th className="px-6 py-3">Animal</th>
              <th className="px-6 py-3">Farm</th>
              <th className="px-6 py-3">Frequency</th>
              <th className="px-6 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedVaccinations.map((v) => (
              <tr key={v._id} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                  {format(new Date(v.date), 'MMM dd, yyyy')}
                  <br />
                  <span className="text-[10px]">{format(new Date(v.date), 'h:mm a')}</span>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={
                      v.eventType === "missed" ? "destructive" : 
                      v.eventType === "completed" || v.eventType === "administered" ? "default" : 
                      "secondary"
                    }
                    className="capitalize text-[10px]"
                  >
                    {v.eventType}
                  </Badge>
                </td>
                <td className="px-6 py-4 font-medium text-foreground">{v.vaccineName}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-foreground">{getAnimalName(v)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {v.animalId?.rfid}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{getFarmName(v)}</td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="font-normal text-[10px] uppercase">
                    {v.repeatsEvery && typeof v.repeatsEvery === 'object' 
                      ? `${v.repeatsEvery.value} ${v.repeatsEvery.unit}` 
                      : v.repeatsEvery || 'One-time'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  {(v.eventType === 'scheduled' || v.eventType === 'missed') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolveEvent(v)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}