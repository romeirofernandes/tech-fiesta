import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Upload, Mic, Square, Loader2, Image as ImageIcon, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
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

  // Fetch only this farmer's animals
  useEffect(() => {
    if (mongoUser?._id) {
      fetchAnimals();
    }
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
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
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
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      toast.error("Microphone access denied. Check browser permissions.");
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
      toast.error("Upload a photo or record symptoms to continue.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      if (imageFile) formData.append("image", imageFile);
      if (audioBlob) formData.append("audio", audioBlob, "symptoms.webm");

      if (selectedAnimalId) {
        const animal = animals.find(a => a._id === selectedAnimalId);
        if (animal) formData.append("animalData", JSON.stringify(animal));
      }

      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/disease-detect/analyze`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        setResult(res.data);
        toast.success("Diagnosis Ready!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Analysis failed. Check API keys.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const diagnosisData = result?.data;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Stethoscope className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Veterinarian</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Disease Detector</h1>
          <p className="text-muted-foreground max-w-2xl">
            Upload a photo <strong>or</strong> describe symptoms in Hindi, Marathi, or English using your voice. You can use both together for even better results.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: Inputs */}
          <div className="lg:col-span-5 space-y-6">

            {/* Animal Selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Your Animal (Optional)</label>
              <select
                className="w-full p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                value={selectedAnimalId}
                onChange={(e) => setSelectedAnimalId(e.target.value)}
              >
                <option value="">-- General Diagnosis --</option>
                {animals.map(animal => (
                  <option key={animal._id} value={animal._id}>
                    {animal.name || animal.rfid || animal.species || "Animal"} — {animal.species} ({animal.gender || "N/A"})
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center justify-between">
                <span>Photo of Affected Area</span>
                {imageFile && <span className="text-xs text-primary font-medium">✓ Photo Added</span>}
              </label>
              <div
                className={`relative group h-56 w-full rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-sm
                  ${imagePreview ? "border-primary border-solid" : "border-dashed border-primary/20 hover:border-primary/50 bg-muted/50"}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-3 group-hover:scale-110 transition-transform text-primary">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Click to upload photo</p>
                    <p className="text-xs text-muted-foreground mt-1">Clear photos give better results</p>
                  </div>
                )}
                {imagePreview && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="rounded-full shadow-lg">
                      <Upload className="mr-2 h-4 w-4" /> Change Photo
                    </Button>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            {/* Voice Input */}
            <div className="space-y-3 p-5 rounded-2xl border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Mic className="h-4 w-4" /> Describe Symptoms
                  </label>
                  <p className="text-xs text-blue-700/70 dark:text-blue-300">Speak in Hindi, Marathi, or English</p>
                </div>
                {audioBlob && !isRecording && (
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Recorded
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 justify-center py-3">
                {isRecording ? (
                  <Button onClick={stopRecording} variant="destructive" className="h-16 w-16 rounded-full animate-pulse shadow-lg shadow-destructive/20">
                    <Square className="h-6 w-6" fill="currentColor" />
                  </Button>
                ) : (
                  <Button onClick={startRecording} className="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-transform hover:scale-105">
                    <Mic className="h-8 w-8" />
                  </Button>
                )}
                {isRecording && <div className="text-blue-600 font-mono text-xl font-bold">{formatTime(recordingTime)}</div>}
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleAnalyze}
              disabled={loading || (!imageFile && !audioBlob)}
              className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/20 transition-all font-bold"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Analyzing...</>
              ) : (
                "Run Disease Diagnosis"
              )}
            </Button>
          </div>

          {/* RIGHT: Results */}
          <div className="lg:col-span-7">
            {!diagnosisData && !loading && (
              <div className="h-full min-h-[400px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-muted/20">
                <div className="p-5 bg-background rounded-full mb-4 shadow-sm border border-border">
                  <Stethoscope className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Awaiting Inputs</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Upload a photo or speak into the mic to describe the problem. The AI will give you advice here.
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full min-h-[400px] rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-primary/5 border border-primary/10">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2 animate-pulse">Analyzing...</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Processing your inputs through AI vision and language models.
                </p>
              </div>
            )}

            {diagnosisData && !loading && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Transcription Display (if voice was used) */}
                {result?.transcription && (
                  <Card className="border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Your Voice (Transcribed)</p>
                      <p className="text-sm text-foreground/80 italic">"{result.transcription}"</p>
                    </CardContent>
                  </Card>
                )}

                {/* Primary Diagnosis */}
                <Card className={`overflow-hidden border-2 ${diagnosisData.severity === "Critical" ? "border-red-500 shadow-red-500/10" :
                    diagnosisData.severity === "High" ? "border-orange-500 shadow-orange-500/10" :
                      diagnosisData.severity === "Medium" ? "border-yellow-500 shadow-yellow-500/10" :
                        "border-green-500 shadow-green-500/10"
                  }`}>
                  <div className={`p-6 ${diagnosisData.severity === "Critical" ? "bg-red-50 dark:bg-red-950/20" :
                      diagnosisData.severity === "High" ? "bg-orange-50 dark:bg-orange-950/20" :
                        diagnosisData.severity === "Medium" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                          "bg-green-50 dark:bg-green-950/20"
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Suspected Condition</span>
                        <h2 className="text-3xl font-black text-foreground">{diagnosisData.diagnosis}</h2>
                      </div>
                      <div className="bg-background px-3 py-1 rounded-full border text-xs font-bold shadow-sm">
                        Confidence: {diagnosisData.confidence}
                      </div>
                    </div>
                    {diagnosisData.vet_needed && (
                      <div className="mt-4 flex items-center gap-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 p-4 rounded-xl border border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-6 w-6 shrink-0" />
                        <p className="text-sm font-bold">Call a veterinarian immediately. This condition needs professional help.</p>
                      </div>
                    )}
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Immediate Actions */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" /> What To Do Now
                      </h3>
                      <ul className="space-y-3">
                        {diagnosisData.immediate_actions?.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center justify-center text-xs font-bold mt-0.5">{idx + 1}</span>
                            <span className="text-sm text-foreground/90">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Symptoms Identified */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-blue-500" /> Symptoms Found
                      </h3>
                      <ul className="space-y-2">
                        {diagnosisData.symptoms_identified?.map((s, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-foreground/80">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Preventative Measures */}
                {diagnosisData.preventative_measures?.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> How To Prevent This
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {diagnosisData.preventative_measures.map((m, idx) => (
                          <div key={idx} className="p-3 bg-muted/30 rounded-lg text-sm border">{m}</div>
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
