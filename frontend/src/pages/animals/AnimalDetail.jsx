import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit2, MapPin, Calendar, Syringe, AlertCircle, CheckCircle, Clock, RefreshCw, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { EditVaccinationEventDialog } from "@/components/EditVaccinationEventDialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function AnimalDetail() {
  const [animal, setAnimal] = useState(null);
  const [vaccinationEvents, setVaccinationEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogMode, setEditDialogMode] = useState("edit"); // "edit" or "add"
  const [deleteEvent, setDeleteEvent] = useState(null);
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
    };
    return emojis[species] || "🐾";
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "administered":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "scheduled":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "missed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "estimated":
        return <Calendar className="h-5 w-5 text-yellow-500" />;
      default:
        return <Syringe className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getEventBadgeVariant = (eventType) => {
    switch (eventType) {
      case "administered":
        return "default";
      case "scheduled":
        return "secondary";
      case "missed":
        return "destructive";
      case "estimated":
        return "outline";
      default:
        return "outline";
    }
  };

  const groupEventsByStatus = () => {
    const now = new Date();
    const past = vaccinationEvents.filter((e) => new Date(e.date) < now && e.eventType === "administered");
    const upcoming = vaccinationEvents.filter((e) => new Date(e.date) >= now || e.eventType === "scheduled");
    const missed = vaccinationEvents.filter((e) => e.eventType === "missed");
    return { past, upcoming, missed };
  };

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
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2">Animal not found</h2>
          <Button onClick={() => navigate("/animals")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Animals
          </Button>
        </div>
      </Layout>
    );
  }

  const { past, upcoming, missed } = groupEventsByStatus();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
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

        {/* Vaccination Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5" />
              Vaccination Timeline
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddEvent}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Vaccination Event
            </Button>
          </CardHeader>
          <CardContent>
            {vaccinationEvents.length === 0 ? (
              <div className="text-center py-12">
                <Syringe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No vaccination events recorded yet
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Missed Vaccinations */}
                {missed.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Missed Vaccinations ({missed.length})
                    </h3>
                    <div className="space-y-3">
                      {missed.map((event) => (
                        <VaccinationEventCard key={event._id} event={event} onEdit={handleEditEvent} onDelete={setDeleteEvent} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Vaccinations */}
                {upcoming.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Upcoming Vaccinations ({upcoming.length})
                    </h3>
                    <div className="space-y-3">
                      {upcoming.map((event) => (
                        <VaccinationEventCard key={event._id} event={event} onEdit={handleEditEvent} onDelete={setDeleteEvent} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Vaccinations */}
                {past.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Past Vaccinations ({past.length})
                    </h3>
                    <div className="space-y-3">
                      {past.map((event) => (
                        <VaccinationEventCard key={event._id} event={event} onEdit={handleEditEvent} onDelete={setDeleteEvent} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

function VaccinationEventCard({ event, onEdit, onDelete }) {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "administered":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "scheduled":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "missed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "estimated":
        return <Calendar className="h-5 w-5 text-yellow-500" />;
      default:
        return <Syringe className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getEventBadgeVariant = (eventType) => {
    switch (eventType) {
      case "administered":
        return "default";
      case "scheduled":
        return "secondary";
      case "missed":
        return "destructive";
      case "estimated":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="mt-1">{getEventIcon(event.eventType)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-medium">{event.vaccineName}</h4>
          <div className="flex items-center gap-2">
            <Badge variant={getEventBadgeVariant(event.eventType)} className="capitalize shrink-0">
              {event.eventType}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit(event)}
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(event)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(event.date), "PPP")}
        </p>
        {event.notes && (
          <p className="text-sm text-muted-foreground mt-2">{event.notes}</p>
        )}
        {event.repeatsEvery?.value && (
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span>
              Repeats every {event.repeatsEvery.value} {event.repeatsEvery.unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}