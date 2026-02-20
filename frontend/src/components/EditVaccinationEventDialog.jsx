import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Sparkles, Link as LinkIcon, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export function EditVaccinationEventDialog({ event, open, onOpenChange, onSuccess, animalId, mode = "edit", suggestedVaccines = [] }) {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificatePreview, setCertificatePreview] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);

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
      setCertificateUrl(event.certificateUrl || null);
    } else {
      setFormData({
        vaccineName: "",
        eventType: "",
        date: "",
        notes: "",
        repeatsEveryValue: "",
        repeatsEveryUnit: "",
      });
      setCertificateUrl(null);
      setCertificateFile(null);
      setCertificatePreview(null);
      setExtractedData(null);
    }
  }, [event, open]);

  // Handle certificate file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setCertificateFile(file);
    setCertificatePreview(URL.createObjectURL(file));
  };

  // Upload certificate + extract info via Gemini
  const handleExtractCertificate = async () => {
    if (!certificateFile) {
      toast.error("Please select a certificate image first");
      return;
    }

    setExtracting(true);
    try {
      const formPayload = new FormData();
      formPayload.append("certificate", certificateFile);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events/extract-certificate`,
        formPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { certificateUrl: url, extractedData: data } = response.data;
      setCertificateUrl(url);
      setExtractedData(data);

      // Auto-fill form with extracted data
      if (data) {
        setFormData((prev) => ({
          ...prev,
          vaccineName: data.vaccineName || prev.vaccineName,
          date: data.date || prev.date,
          eventType: "administered",
          notes: [
            data.veterinarian ? `Vet: ${data.veterinarian}` : "",
            data.batchNumber ? `Batch: ${data.batchNumber}` : "",
            data.notes || "",
          ]
            .filter(Boolean)
            .join(". ") || prev.notes,
        }));
      }

      toast.success("Certificate scanned! Form auto-filled with extracted data.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to extract certificate info");
    } finally {
      setExtracting(false);
    }
  };

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
        certificateUrl: certificateUrl || null,
        extractedData: extractedData || null,
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
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data?.blockchain?.txHash) {
          toast.success(
            <div>
              <p className="font-medium">Vaccination event created & recorded on blockchain!</p>
              <a
                href={res.data.blockchain.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 underline mt-1 inline-block"
              >
                View on Polygonscan →
              </a>
            </div>,
            { duration: 8000 }
          );
        } else {
          toast.success("Vaccination event created successfully!");
        }
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Vaccination Event" : "Edit Vaccination Event"}</DialogTitle>
        </DialogHeader>

        {/* Certificate Upload Section */}
        {mode === "add" && (
          <div className="space-y-3 rounded-lg border border-dashed p-4 bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Upload Vaccination Certificate
              <Badge variant="outline" className="ml-auto text-[10px]">
                Blockchain Verified
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a photo of the vaccination record or certificate. AI will extract the details and the record will be stored immutably on the Polygon blockchain.
            </p>

            {/* File Input */}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors">
                  <Upload className="h-4 w-4" />
                  {certificateFile ? certificateFile.name : "Choose image..."}
                </div>
              </label>
              <Button
                type="button"
                size="sm"
                onClick={handleExtractCertificate}
                disabled={!certificateFile || extracting}
                className="gap-1"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    Scan with AI
                  </>
                )}
              </Button>
            </div>

            {/* Preview */}
            {certificatePreview && (
              <div className="relative">
                <img
                  src={certificatePreview}
                  alt="Certificate preview"
                  className="w-full max-h-40 object-contain rounded-md border"
                />
                {certificateUrl && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 text-white text-[10px] gap-1">
                      <LinkIcon className="h-3 w-3" />
                      Uploaded
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Extracted info preview */}
            {extractedData && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-1">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Extracted Info
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {extractedData.vaccineName && (
                    <>
                      <span className="font-medium">Vaccine:</span>
                      <span>{extractedData.vaccineName}</span>
                    </>
                  )}
                  {extractedData.date && (
                    <>
                      <span className="font-medium">Date:</span>
                      <span>{extractedData.date}</span>
                    </>
                  )}
                  {extractedData.veterinarian && (
                    <>
                      <span className="font-medium">Vet:</span>
                      <span>{extractedData.veterinarian}</span>
                    </>
                  )}
                  {extractedData.batchNumber && (
                    <>
                      <span className="font-medium">Batch #:</span>
                      <span>{extractedData.batchNumber}</span>
                    </>
                  )}
                  {extractedData.species && (
                    <>
                      <span className="font-medium">Species:</span>
                      <span>{extractedData.species}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show blockchain proof for existing events */}
        {mode === "edit" && event?.blockchain?.txHash && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
              <ShieldCheck className="h-4 w-4" />
              Blockchain Verified
            </div>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>
                <span className="font-medium">Tx Hash:</span>{" "}
                <code className="text-[10px]">{event.blockchain.txHash.slice(0, 20)}...{event.blockchain.txHash.slice(-8)}</code>
              </p>
              <p>
                <span className="font-medium">Block:</span> {event.blockchain.blockNumber}
              </p>
            </div>
            <a
              href={event.blockchain.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View on Polygonscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Show uploaded certificate image for existing events */}
        {mode === "edit" && event?.certificateUrl && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Uploaded Certificate</Label>
            <img
              src={event.certificateUrl}
              alt="Vaccination certificate"
              className="w-full max-h-40 object-contain rounded-md border"
            />
          </div>
        )}

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
                  {certificateUrl ? "Saving & Recording on Chain..." : "Saving..."}
                </>
              ) : (
                <>
                  {mode === "add" ? "Add Event" : "Save Changes"}
                  {mode === "add" && certificateUrl && (
                    <ShieldCheck className="ml-1 h-4 w-4" />
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}