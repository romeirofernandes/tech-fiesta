import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Stethoscope,
  Mic,
  Square,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
  X,
  ShieldCheck,
  Loader2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";

export default function DiseaseDetector() {
  const { mongoUser } = useUser();
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (mongoUser?._id) fetchAnimals();
  }, [mongoUser]);

  const fetchAnimals = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals?farmerId=${mongoUser._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnimals(res.data);
    } catch (err) {
      console.error("Error fetching animals:", err);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((p) => p + 1),
        1000
      );
    } catch {
      toast.error("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile && !audioBlob) {
      toast.error("Upload a photo or record symptoms first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (imageFile) formData.append("image", imageFile);
      if (audioBlob) formData.append("audio", audioBlob, "symptoms.webm");
      if (selectedAnimalId && selectedAnimalId !== "none") {
        const animal = animals.find((a) => a._id === selectedAnimalId);
        if (animal) formData.append("animalData", JSON.stringify(animal));
      }
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/disease-detect/analyze`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (res.data.success) {
        setResult(res.data);
        toast.success("Diagnosis ready!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  const d = result?.data;

  return (
    <Layout>
      <div className="space-y-6 px-4 md:px-6 lg:px-8 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {/* <Stethoscope className="h-8 w-8 text-primary" /> */}
            <span>Disease Detector</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload a photo or describe symptoms in Hindi, Marathi, or English.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── LEFT: Input Form ── */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Input</CardTitle>
              <CardDescription>
                Provide a photo and / or voice symptoms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Animal */}
              <div className="space-y-1.5">
                <Label>Animal (Optional)</Label>
                <Select
                  value={selectedAnimalId}
                  onValueChange={setSelectedAnimalId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an animal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General Diagnosis</SelectItem>
                    {animals.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name || a.rfid || a.species || "Animal"} (
                        {a.gender || "N/A"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload — large visible area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Photo of Affected Area</Label>
                  {imageFile && (
                    <button
                      onClick={clearImage}
                      className="text-xs text-destructive hover:underline flex items-center gap-0.5"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
                <div
                  className={`relative w-full rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${imagePreview
                    ? "border-primary"
                    : "border-dashed border-border hover:border-primary/50"
                    }`}
                  style={{ height: "200px" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Uploaded symptom"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-background/90 rounded-lg px-3 py-1.5 text-sm font-medium">
                          <Upload className="h-4 w-4" /> Change Photo
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20">
                      <div className="p-3 rounded-full bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Click to upload photo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG up to 5MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Voice Recording */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Describe Symptoms (Voice)</Label>
                  {audioBlob && !isRecording && (
                    <button
                      onClick={() => {
                        setAudioBlob(null);
                        setRecordingTime(0);
                      }}
                      className="text-xs text-destructive hover:underline flex items-center gap-0.5"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="h-9 w-9 rounded-full bg-destructive flex items-center justify-center animate-pulse shrink-0"
                      >
                        <Square
                          className="h-3.5 w-3.5 text-destructive-foreground"
                          fill="currentColor"
                        />
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        className="h-9 w-9 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors shrink-0"
                      >
                        <Mic className="h-4 w-4 text-primary-foreground" />
                      </button>
                    )}
                    <div className="min-w-0">
                      {isRecording ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-destructive">
                            {formatTime(recordingTime)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Recording...
                          </span>
                        </div>
                      ) : audioBlob ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium text-primary">
                            Recorded ({formatTime(recordingTime)})
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium">Tap to record</p>
                          <p className="text-xs text-muted-foreground">
                            Hindi / Marathi / English
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                className="w-full h-11 font-semibold gap-2"
                onClick={handleAnalyze}
                disabled={loading || (!imageFile && !audioBlob)}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <HeartPulse className="h-4 w-4" /> Run Diagnosis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ── RIGHT: Results (2 cols wide) ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Loading */}
            {loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center text-center py-20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                  <p className="text-base font-semibold animate-pulse">
                    Analyzing...
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Processing with Gemini Vision & Whisper
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!d && !loading && (
              <Card className="border-2 border-dashed border-border">
                <CardContent className="flex flex-col items-center justify-center text-center py-20">
                  <div className="p-4 bg-muted rounded-full mb-3">
                    <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-base font-semibold text-muted-foreground">
                    Awaiting Diagnosis
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
                    Upload a photo or record symptoms on the left, then click
                    "Run Diagnosis".
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {d && !loading && (
              <div className="space-y-4">
                {/* Transcription */}
                {result?.transcription && (
                  <div className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
                    <div className="bg-muted p-2 rounded-lg shrink-0">
                      <Mic className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                        Your Voice (Transcribed)
                      </p>
                      <p className="text-sm text-foreground/80 italic mt-0.5">
                        "{result.transcription}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Diagnosis card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                          <Stethoscope className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                            Suspected Condition
                          </p>
                          <h2 className="text-xl font-bold text-foreground">
                            {d.diagnosis}
                          </h2>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold"
                        >
                          {d.confidence} confidence
                        </Badge>
                        <Badge
                          variant={
                            d.severity === "Critical" || d.severity === "High"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] font-bold"
                        >
                          {d.severity} severity
                        </Badge>
                        <Badge
                          variant={d.vet_needed ? "destructive" : "secondary"}
                          className="text-[10px] font-bold"
                        >
                          Vet {d.vet_needed ? "Needed" : "Not Needed"}
                        </Badge>
                      </div>
                    </div>
                    {d.vet_needed && (
                      <div className="flex items-center gap-3 bg-destructive/10 text-destructive p-3 rounded-lg mt-3 border border-destructive/20">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p className="text-sm font-semibold">
                          Call a veterinarian immediately. This condition needs
                          professional help.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Symptoms + Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />{" "}
                        Symptoms Identified
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1.5">
                      {d.symptoms_identified?.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-foreground/80"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {s}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />{" "}
                        What To Do Now
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {d.immediate_actions?.map((action, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-foreground/90">
                            {action}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Prevention */}
                {d.preventative_measures?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />{" "}
                        Prevention Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {d.preventative_measures.map((m, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-muted/30 rounded-lg text-sm border border-border"
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
