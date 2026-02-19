import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Syringe,
  List,
  Grid2x2,
  Grid3x3,
  CalendarDays,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { getSpeciesIcon } from "@/lib/animalIcons";
import { useUser } from "@/context/UserContext";
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

const TODAY = Date.now();

const EVENT_COLORS = {
  administered: "bg-green-600 text-white",
  scheduled: "bg-blue-600 text-white",
  missed: "bg-red-600 text-white",
  estimated: "bg-yellow-600 text-white",
};

const EVENT_DOT_COLORS = {
  administered: "bg-green-500",
  scheduled: "bg-blue-500",
  missed: "bg-red-500",
  estimated: "bg-yellow-500",
};

export default function VaccinationCalendar() {
  const { mongoUser } = useUser();
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("all");
  const [vaccinationEvents, setVaccinationEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(TODAY));
  const [view, setView] = useState("month"); // list, 2col, month, week

  useEffect(() => {
    if (mongoUser) {
        fetchAnimals();
    }
  }, [mongoUser]);

  useEffect(() => {
    if (mongoUser) {
      fetchVaccinationEvents();
    }
  }, [selectedAnimalId, mongoUser]);

  const fetchAnimals = async () => {
    if (!mongoUser) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals`,
        { 
            headers: { Authorization: `Bearer ${token}` },
            params: { farmerId: mongoUser._id }
        }
      );
      setAnimals(response.data);
    } catch (error) {
      toast.error("Failed to fetch animals");
    }
  };

  const fetchVaccinationEvents = async () => {
    if (!mongoUser) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = { farmerId: mongoUser._id };
      if (selectedAnimalId !== "all") {
        params.animalId = selectedAnimalId;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );
      setVaccinationEvents(response.data);
    } catch (error) {
      toast.error("Failed to fetch vaccination events");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEvent = async (event) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events/${event._id}/resolve`
      );
      toast.success("Vaccination marked as done!");
      fetchVaccinationEvents();
    } catch (error) {
      toast.error("Failed to resolve vaccination event");
    }
  };

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map = {};
    vaccinationEvents.forEach((event) => {
      const dateKey = format(new Date(event.date), "yyyy-MM-dd");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    return map;
  }, [vaccinationEvents]);

  // Generate calendar days for the month grid
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

  const totalEvents = vaccinationEvents.length;

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(startOfMonth(TODAY));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const rangeLabel = `${format(monthStart, "MMM d, yyyy")} - ${format(monthEnd, "MMM d, yyyy")}`;

  const getAnimalName = (event) => {
    if (event.animalId && typeof event.animalId === "object") {
      return event.animalId.name;
    }
    const animal = animals.find((a) => a._id === event.animalId);
    return animal ? animal.name : "Unknown";
  };


  const MAX_VISIBLE_EVENTS = 3;

  return (
    <Layout>
      <div className="space-y-6 max-w-full px-2 sm:px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {format(currentMonth, "MMMM yyyy")}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Navigation */}
            <div className="flex items-center gap-1 border rounded-lg px-1 py-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 hidden lg:inline">
                {rangeLabel}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Switcher */}
            <div className="flex items-center border rounded-lg p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("list")}>
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={view === "2col" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("2col")}>
                    <Grid2x2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>2-Column View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={view === "month" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("month")}>
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Month View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={view === "week" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("week")}>
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Week View</TooltipContent>
              </Tooltip>
            </div>

            {/* Animal Filter */}
            <Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="All Animals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {animals.map((animal) => (
                  <SelectItem key={animal._id} value={animal._id}>
                    <span className="flex items-center gap-1">{getSpeciesIcon(animal.species, "h-4 w-4 inline")} {animal.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center min-h-100">
                <div className="text-muted-foreground">Loading events...</div>
              </div>
            </CardContent>
          </Card>
        ) : view === "month" ? (
          <MonthView
            calendarDays={calendarDays}
            currentMonth={currentMonth}
            eventsByDate={eventsByDate}
            today={TODAY}
            getAnimalName={getAnimalName}
            maxVisible={MAX_VISIBLE_EVENTS}
            onResolveEvent={handleResolveEvent}
          />
        ) : view === "week" ? (
          <WeekView
            today={TODAY}
            currentMonth={currentMonth}
            eventsByDate={eventsByDate}
            getAnimalName={getAnimalName}
            onResolveEvent={handleResolveEvent}
          />
        ) : view === "list" ? (
          <ListView
            vaccinationEvents={vaccinationEvents}
            getAnimalName={getAnimalName}
            currentMonth={currentMonth}
            onResolveEvent={handleResolveEvent}
          />
        ) : (
          <TwoColumnView
            calendarDays={calendarDays}
            currentMonth={currentMonth}
            eventsByDate={eventsByDate}
            today={TODAY}
            vaccinationEvents={vaccinationEvents}
            getAnimalName={getAnimalName}
            maxVisible={MAX_VISIBLE_EVENTS}
          />
        )}
      </div>
    </Layout>
  );
}

/* ======================== MONTH VIEW ======================== */
function MonthView({ calendarDays, currentMonth, eventsByDate, today, getAnimalName, maxVisible, onResolveEvent }) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
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
          const isCurrentDay = isSameDay(day, today);
          const hasOverflow = dayEvents.length > maxVisible;

          return (
            <div
              key={idx}
              className={`min-h-30 sm:min-h-35 border-b border-r p-1.5 sm:p-2 transition-colors ${
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
              <div className="space-y-0.5">
                {dayEvents.slice(0, maxVisible).map((event) => (
                  <Tooltip key={event._id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`text-[11px] sm:text-xs px-1.5 py-0.5 rounded truncate cursor-default group relative ${
                          EVENT_COLORS[event.eventType] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="hidden sm:inline">{event.vaccineName}</span>
                        <span className="sm:hidden">{event.vaccineName.substring(0, 8)}...</span>
                        <span className="ml-1 opacity-75 hidden lg:inline">
                          {format(new Date(event.date), "h:mm a")}
                        </span>
                        {onResolveEvent && (event.eventType === 'scheduled' || event.eventType === 'missed') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onResolveEvent(event); }}
                            className="absolute right-0.5 top-0 bottom-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                            type="button"
                            title="Mark as Done"
                          >
                            <CheckCircle className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{event.vaccineName}</p>
                        <p className="text-xs opacity-80">{getAnimalName(event)}</p>
                        <p className="text-xs opacity-80">
                          {format(new Date(event.date), "PPP")}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-[11px] text-muted-foreground cursor-default hover:text-foreground transition-colors px-1">
                        {dayEvents.length - maxVisible} more...
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        {dayEvents.slice(maxVisible).map((event) => (
                          <div key={event._id} className="text-xs">
                            <span className="font-medium">{event.vaccineName}</span>
                            {" — "}
                            <span className="opacity-80">{getAnimalName(event)}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ======================== WEEK VIEW ======================== */
function WeekView({ today, eventsByDate, getAnimalName, onEditEvent, onDeleteEvent, onResolveEvent }) {
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <div className="divide-y">
        {weekDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentDay = isSameDay(day, today);

          return (
            <div
              key={dateKey}
              className={`flex flex-col sm:flex-row ${
                isCurrentDay ? "bg-accent/20" : ""
              }`}
            >
              <div
                className={`px-4 py-3 border-b sm:border-b-0 sm:border-r sm:w-27.5 shrink-0 text-center ${
                  isCurrentDay ? "bg-primary/10" : "bg-muted/30"
                }`}
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-lg font-bold ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground rounded-full w-8 h-8 inline-flex items-center justify-center mx-auto"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              <div className="flex-1 p-3 space-y-2">
                {dayEvents.map((event) => (
                  <Tooltip key={event._id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`text-xs px-2 py-1.5 rounded cursor-default group relative ${
                          EVENT_COLORS[event.eventType] ||
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        <div className="font-medium truncate">
                          {event.vaccineName}
                        </div>
                        <div className="opacity-75 text-[10px]">
                          {getAnimalName(event)}
                        </div>
                        {onResolveEvent && (event.eventType === 'scheduled' || event.eventType === 'missed') && (
                          <div className="absolute right-0.5 top-0 bottom-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); onResolveEvent(event); }}
                              className="p-0.5 rounded hover:bg-white/20"
                              type="button"
                              title="Mark as Done"
                            >
                              <CheckCircle className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>
                        <p className="font-medium">{event.vaccineName}</p>
                        <p className="text-xs opacity-80">
                          {format(new Date(event.date), "PPP")}
                        </p>
                        <p className="text-xs opacity-80 capitalize">
                          {event.eventType}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {dayEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center py-4">
                    No events
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* ======================== LIST VIEW ======================== */
function ListView({ vaccinationEvents, getAnimalName, currentMonth, onResolveEvent }) {
  const monthEvents = vaccinationEvents.filter((e) => isSameMonth(new Date(e.date), currentMonth));

  const grouped = monthEvents.reduce((acc, event) => {
    const dateKey = format(new Date(event.date), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  if (sortedDates.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Syringe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No vaccination events this month</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => (
        <Card key={dateKey}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
              {isSameDay(new Date(dateKey), TODAY) && (
                <Badge variant="secondary" className="ml-2 text-xs">Today</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped[dateKey].map((event) => (
              <div
                key={event._id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors"
              >
                <div className={`w-1.5 h-10 rounded-full ${EVENT_DOT_COLORS[event.eventType]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{event.vaccineName}</span>
                    <Badge
                      variant={event.eventType === "missed" ? "destructive" : event.eventType === "administered" ? "default" : "secondary"}
                      className="capitalize text-[10px]"
                    >
                      {event.eventType}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{getAnimalName(event)}</p>
                </div>
                <span className="text-sm text-muted-foreground shrink-0">
                  {format(new Date(event.date), "h:mm a")}
                </span>
                {onResolveEvent && (event.eventType === 'scheduled' || event.eventType === 'missed') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-green-600 hover:text-green-700 shrink-0"
                    onClick={() => onResolveEvent(event)}
                    title="Mark as Done"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ======================== TWO COLUMN VIEW ======================== */
function TwoColumnView({ calendarDays, currentMonth, eventsByDate, today, vaccinationEvents, getAnimalName, maxVisible }) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthEvents = vaccinationEvents
    .filter((e) => isSameMonth(new Date(e.date), currentMonth))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Mini Calendar */}
      <div className="lg:col-span-2">
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isSameDay(day, today);

              return (
                <div
                  key={idx}
                  className={`min-h-25 border-b border-r p-2 transition-colors ${
                    !isCurrentMonth ? "bg-muted/20 text-muted-foreground/50" : "hover:bg-accent/30"
                  }`}
                >
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
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.map((event) => (
                      <div
                        key={event._id}
                        className={`w-2 h-2 rounded-full ${EVENT_DOT_COLORS[event.eventType]}`}
                        title={event.vaccineName}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events List Sidebar */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              Events this month
              <Badge variant="secondary" className="ml-auto text-xs">
                {monthEvents.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-150 overflow-y-auto">
            {monthEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No events this month</p>
            ) : (
              monthEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-accent/30 transition-colors"
                >
                  <div className={`w-1 h-full min-h-10 rounded-full shrink-0 ${EVENT_DOT_COLORS[event.eventType]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{event.vaccineName}</p>
                    <p className="text-xs text-muted-foreground">{getAnimalName(event)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(event.date), "MMM d, h:mm a")}</p>
                  </div>
                  <Badge
                    variant={event.eventType === "missed" ? "destructive" : event.eventType === "administered" ? "default" : "secondary"}
                    className="capitalize text-[10px] shrink-0"
                  >
                    {event.eventType}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
