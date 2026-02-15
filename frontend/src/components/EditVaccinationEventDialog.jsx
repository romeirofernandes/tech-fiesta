import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export function EditVaccinationEventDialog({ event, open, onOpenChange, onSuccess, animalId, mode = "edit", suggestedVaccines = [] }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vaccineName: "",
    eventType: "",
    date: "",
    notes: "",
    repeatsEveryValue: "",
    repeatsEveryUnit: "",
  });

  // Sync formData with event prop
  useEffect(() => {
    if (event) {
      setFormData({
        vaccineName: event.vaccineName || "",
        eventType: event.eventType || "",
        date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
        notes: event.notes || "",
        repeatsEveryValue: event.repeatsEvery?.value || "",
        repeatsEveryUnit: event.repeatsEvery?.unit || "",
      });
    } else {
      setFormData({
        vaccineName: "",
        eventType: "",
        date: "",
        notes: "",
        repeatsEveryValue: "",
        repeatsEveryUnit: "",
      });
    }
  }, [event, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        vaccineName: formData.vaccineName,
        eventType: formData.eventType,
        date: formData.date,
        notes: formData.notes || null,
        repeatsEvery: formData.repeatsEveryValue
          ? {
              value: parseInt(formData.repeatsEveryValue),
              unit: formData.repeatsEveryUnit,
            }
          : null,
        animalId: animalId,
      };

      if (mode === "edit" && event && event._id) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events/${event._id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Vaccination event updated successfully!");
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Vaccination event created successfully!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save vaccination event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Vaccination Event" : "Edit Vaccination Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vaccineName">Vaccine Name *</Label>
            {mode === "add" && suggestedVaccines.length > 0 ? (
              <>
                <Select
                  value={formData.vaccineName}
                  onValueChange={(value) => {
                    const schedule = suggestedVaccines.find(s => s.disease === value);
                    setFormData((prev) => ({
                      ...prev,
                      vaccineName: value,
                      notes: schedule ? [
                        schedule.doseAndRoute !== '—' ? `Dose: ${schedule.doseAndRoute}` : '',
                        schedule.boosterSchedule !== '—' ? `Schedule: ${schedule.boosterSchedule}` : '',
                        schedule.notes || ''
                      ].filter(Boolean).join('. ') : prev.notes
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from schedule or type below" />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedVaccines.map((s) => (
                      <SelectItem key={s._id} value={s.disease}>
                        {s.disease}{s.vaccineName !== '—' ? ` (${s.vaccineName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="vaccineName"
                  value={formData.vaccineName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vaccineName: e.target.value }))}
                  placeholder="Or type custom vaccine name..."
                  className="mt-1"
                />
              </>
            ) : (
              <Input
                id="vaccineName"
                value={formData.vaccineName}
                onChange={(e) => setFormData((prev) => ({ ...prev, vaccineName: e.target.value }))}
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type *</Label>
            <Select
              value={formData.eventType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, eventType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="administered">Administered</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="estimated">Estimated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this vaccination..."
              className="w-full min-h-20 px-3 py-2 border rounded-md bg-transparent text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Repeats Every (Optional)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={formData.repeatsEveryValue}
                onChange={(e) => setFormData((prev) => ({ ...prev, repeatsEveryValue: e.target.value }))}
                placeholder="0"
                className="flex-1"
              />
              <Select
                value={formData.repeatsEveryUnit}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, repeatsEveryUnit: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="years">Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                mode === "add" ? "Add Event" : "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}