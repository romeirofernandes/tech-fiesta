import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit2, MapPin, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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
import { EditVaccinationEventDialog } from "@/components/EditVaccinationEventDialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { VaccinationCalendarViews } from "@/components/VaccinationCalendarViews";

const TODAY = Date.now();

export default function AnimalDetail() {
  const [animal, setAnimal] = useState(null);
  const [vaccinationEvents, setVaccinationEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogMode, setEditDialogMode] = useState("edit"); // "edit" or "add"
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(TODAY));
  const [view, setView] = useState("month"); // list, 2col, month, week
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchAnimalDetails();
  }, [id]);

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

  const getSpeciesEmoji = (species) => {
    const emojis = {
      cow: "🐄",
      buffalo: "🐃",
      goat: "🐐",
      sheep: "🐑",
      chicken: "🐔",
      pig: "🐷",
      horse: "🐴",
      other: "🐾",
    };
    return emojis[species] || "🐾";
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
          <Button
            variant="ghost"
            onClick={() => navigate("/animals")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => navigate(`/animals/${id}/edit`)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Animal
          </Button>
        </div>

        {/* Animal Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={animal.imageUrl} alt={animal.name} className="object-contain" />
                <AvatarFallback className="text-6xl">
                  {getSpeciesEmoji(animal.species)}
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
        />
      </div>
    </Layout>
  );
}