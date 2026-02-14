import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Syringe,
  List,
  Grid2x2,
  Grid3x3,
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

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

export function VaccinationCalendarViews({
  today,
  currentMonth,
  setCurrentMonth,
  view,
  setView,
  loading,
  vaccinationEvents,
  eventsByDate,
  calendarDays,
  getAnimalName,
  maxVisible = 3,
  extraControls = null,
  onEditEvent,
  onDeleteEvent,
}) {
  const totalEvents = vaccinationEvents.length;

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(startOfMonth(today));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const rangeLabel = `${format(monthStart, "MMM d, yyyy")} - ${format(monthEnd, "MMM d, yyyy")}`;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 border rounded-lg px-1 py-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1 hidden lg:inline">
              {rangeLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center border rounded-lg p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === "2col" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView("2col")}
                >
                  <Grid2x2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>2-Column View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === "month" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView("month")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Month View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === "week" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView("week")}
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Week View</TooltipContent>
            </Tooltip>
          </div>

          {extraControls}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-muted-foreground">Loading events...</div>
            </div>
          </CardContent>
        </Card>
      ) : view === "month" ? (
        <MonthView
          calendarDays={calendarDays}
          currentMonth={currentMonth}
          eventsByDate={eventsByDate}
          today={today}
          getAnimalName={getAnimalName}
          maxVisible={maxVisible}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
        />
      ) : view === "week" ? (
        <WeekView
          today={today}
          eventsByDate={eventsByDate}
          getAnimalName={getAnimalName}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
        />
      ) : view === "list" ? (
        <ListView
          vaccinationEvents={vaccinationEvents}
          getAnimalName={getAnimalName}
          currentMonth={currentMonth}
          today={today}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
        />
      ) : (
        <TwoColumnView
          calendarDays={calendarDays}
          currentMonth={currentMonth}
          eventsByDate={eventsByDate}
          today={today}
          vaccinationEvents={vaccinationEvents}
          getAnimalName={getAnimalName}
        />
      )}
    </>
  );
}

function EventActions({ event, onEditEvent, onDeleteEvent }) {
  if (!onEditEvent && !onDeleteEvent) return null;
  return (
    <div className="absolute right-0.5 top-0 bottom-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {onEditEvent && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditEvent(event);
          }}
          className="p-0.5 rounded hover:bg-white/20"
          type="button"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
      )}
      {onDeleteEvent && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteEvent(event);
          }}
          className="p-0.5 rounded hover:bg-white/20"
          type="button"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

/* ======================== MONTH VIEW ======================== */
function MonthView({
  calendarDays,
  currentMonth,
  eventsByDate,
  today,
  getAnimalName,
  maxVisible,
  onEditEvent,
  onDeleteEvent,
}) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-3"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonthDay = isSameMonth(day, currentMonth);
          const isCurrentDay = isSameDay(day, today);
          const hasOverflow = dayEvents.length > maxVisible;

          return (
            <div
              key={idx}
              className={`min-h-[120px] sm:min-h-[140px] border-b border-r p-1.5 sm:p-2 transition-colors ${
                !isCurrentMonthDay
                  ? "bg-muted/20 text-muted-foreground/50"
                  : "hover:bg-accent/30"
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

              <div className="space-y-0.5">
                {dayEvents.slice(0, maxVisible).map((event) => (
                  <Tooltip key={event._id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`text-[11px] sm:text-xs px-1.5 py-0.5 rounded truncate cursor-default group relative ${
                          EVENT_COLORS[event.eventType] ||
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="hidden sm:inline">
                          {event.vaccineName}
                        </span>
                        <span className="sm:hidden">
                          {event.vaccineName.substring(0, 8)}...
                        </span>
                        <span className="ml-1 opacity-75 hidden lg:inline">
                          {format(new Date(event.date), "h:mm a")}
                        </span>
                        <EventActions
                          event={event}
                          onEditEvent={onEditEvent}
                          onDeleteEvent={onDeleteEvent}
                        />
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
                            <span className="font-medium">
                              {event.vaccineName}
                            </span>
                            {" — "}
                            <span className="opacity-80">
                              {getAnimalName(event)}
                            </span>
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

/* ======================== WEEK VIEW (VERTICAL) ======================== */
function WeekView({ today, eventsByDate, getAnimalName, onEditEvent, onDeleteEvent }) {
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
                className={`px-4 py-3 border-b sm:border-b-0 sm:border-r sm:w-[110px] shrink-0 text-center ${
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
                        <EventActions
                          event={event}
                          onEditEvent={onEditEvent}
                          onDeleteEvent={onDeleteEvent}
                        />
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
function ListView({
  vaccinationEvents,
  getAnimalName,
  currentMonth,
  today,
  onEditEvent,
  onDeleteEvent,
}) {
  const monthEvents = vaccinationEvents.filter((e) =>
    isSameMonth(new Date(e.date), currentMonth)
  );

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
              {isSameDay(new Date(dateKey), today) && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Today
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped[dateKey].map((event) => (
              <div
                key={event._id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors group relative"
              >
                <div
                  className={`w-1.5 h-10 rounded-full ${
                    EVENT_DOT_COLORS[event.eventType]
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{event.vaccineName}</span>
                    <Badge
                      variant={
                        event.eventType === "missed"
                          ? "destructive"
                          : event.eventType === "administered"
                            ? "default"
                            : "secondary"
                      }
                      className="capitalize text-[10px]"
                    >
                      {event.eventType}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getAnimalName(event)}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground shrink-0">
                  {format(new Date(event.date), "h:mm a")}
                </span>

                {(onEditEvent || onDeleteEvent) && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {onEditEvent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEditEvent(event)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDeleteEvent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onDeleteEvent(event)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
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
function TwoColumnView({
  calendarDays,
  currentMonth,
  eventsByDate,
  today,
  vaccinationEvents,
  getAnimalName,
}) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthEvents = vaccinationEvents
    .filter((e) => isSameMonth(new Date(e.date), currentMonth))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-3"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate[dateKey] || [];
              const isCurrentMonthDay = isSameMonth(day, currentMonth);
              const isCurrentDay = isSameDay(day, today);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r p-2 transition-colors ${
                    !isCurrentMonthDay
                      ? "bg-muted/20 text-muted-foreground/50"
                      : "hover:bg-accent/30"
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
                        className={`w-2 h-2 rounded-full ${
                          EVENT_DOT_COLORS[event.eventType]
                        }`}
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
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {monthEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No events this month
              </p>
            ) : (
              monthEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-accent/30 transition-colors"
                >
                  <div
                    className={`w-1 h-full min-h-[40px] rounded-full shrink-0 ${
                      EVENT_DOT_COLORS[event.eventType]
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{event.vaccineName}</p>
                    <p className="text-xs text-muted-foreground">
                      {getAnimalName(event)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.date), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      event.eventType === "missed"
                        ? "destructive"
                        : event.eventType === "administered"
                          ? "default"
                          : "secondary"
                    }
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
