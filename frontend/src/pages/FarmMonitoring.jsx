import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScanFace, Play, Square, Loader2, AlertCircle, CheckCircle, Video, Camera, Clock, Activity } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

export default function FarmMonitoring() {
    const { mongoUser } = useUser();
    const [farms, setFarms] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState("");
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [lastChecked, setLastChecked] = useState(null);
    const [presentAnimals, setPresentAnimals] = useState([]);
    const [missingAnimals, setMissingAnimals] = useState([]);
    const [error, setError] = useState(null);
    const [nextScanIn, setNextScanIn] = useState(30);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);
    const countdownRef = useRef(null);

    useEffect(() => {
        if (mongoUser) {
            fetchFarms();
        }
        return () => {
            stopMonitoring();
        };
    }, [mongoUser]);

    useEffect(() => {
        if (isMonitoring) {
            countdownRef.current = setInterval(() => {
                setNextScanIn((prev) => (prev > 0 ? prev - 1 : 30));
            }, 1000);
        } else {
            clearInterval(countdownRef.current);
            setNextScanIn(30);
        }
        return () => clearInterval(countdownRef.current);
    }, [isMonitoring]);

    const fetchFarms = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/farms`, { params: { farmerId: mongoUser._id } });
            const farmData = Array.isArray(res.data) ? res.data : [];
            setFarms(farmData);
            if (farmData.length > 0) {
                setSelectedFarm(farmData[0]._id);
            }
        } catch (err) {
            console.error("Failed to fetch farms", err);
            setError("Could not load farms.");
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Unable to access camera. Please allow permission.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const captureAndCheck = async () => {
        setNextScanIn(30); // Reset countdown on scan
        if (!selectedFarm || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const formData = new FormData();
            formData.append("image", blob, "frame.jpg");
            formData.append("farmId", selectedFarm);

            try {
                const base = import.meta.env.VITE_API_BASE_URL;
                const res = await axios.post(`${base}/api/animals/monitor`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                setPresentAnimals(res.data.present || []);
                setMissingAnimals(res.data.missing || []);
                setLastChecked(new Date());
                setError(null);
            } catch (err) {
                console.error("Monitoring check failed", err);
            }
        }, 'image/jpeg');
    };

    const toggleMonitoring = () => {
        if (isMonitoring) {
            stopMonitoring();
        } else {
            startMonitoring();
        }
    };

    const startMonitoring = () => {
        setError(null);
        if (!selectedFarm) {
            setError("Please select a farm first.");
            return;
        }
        setIsMonitoring(true);
        startCamera();
        
        // Initial check after camera warms up (2s)
        setTimeout(captureAndCheck, 2000);

        // Set interval for every 30 seconds
        intervalRef.current = setInterval(captureAndCheck, 30000);
    };

    const stopMonitoring = () => {
        setIsMonitoring(false);
        stopCamera();
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const AnimalCard = ({ animal, status }) => (
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-background shadow-sm shrink-0">
                {animal.imageUrl ? (
                    <img src={animal.imageUrl} alt={animal.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                        <span className="text-xs font-bold">{animal.name[0]}</span>
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{animal.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {animal.species} • {animal.rfid}
                </p>
            </div>
            <Badge variant={status === 'missing' ? "destructive" : "default"} className="uppercase text-[10px] tracking-wider">
                {status}
            </Badge>
        </div>
    );

    return (
        <Layout>
            <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
                {/* Controls Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Video className="h-6 w-6 text-primary" />
                            Farm Monitor
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Real-time AI surveillance system
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Select value={selectedFarm} onValueChange={setSelectedFarm} disabled={isMonitoring}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select Farm" />
                            </SelectTrigger>
                            <SelectContent>
                                {farms.map((farm) => (
                                    <SelectItem key={farm._id} value={farm._id}>
                                        {farm.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        <Button 
                            onClick={toggleMonitoring} 
                            variant={isMonitoring ? "destructive" : "default"}
                            className="w-[120px] transition-all"
                        >
                            {isMonitoring ? (
                                <>
                                    <Square className="mr-2 h-4 w-4 fill-current" /> Stop
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4 fill-current" /> Start
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Left Column: Live Feed (7 Cols) */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <Card className="flex-1 overflow-hidden relative border-0 shadow-lg bg-black ring-1 ring-border/20">
                            {/* Camera UI Overlay */}
                            <div className="absolute inset-4 z-20 pointer-events-none flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono text-white/90 border border-white/10">
                                        <div className={cn("h-2 w-2 rounded-full", isMonitoring ? "bg-red-500 animate-pulse" : "bg-gray-500")} />
                                        {isMonitoring ? "LIVE REC" : "STANDBY"}
                                    </div>
                                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono text-white/90 border border-white/10 flex items-center gap-2">
                                        <Activity className="h-3 w-3" />
                                        SCAN IN: {nextScanIn}s
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-mono text-white/50">
                                        CAM-01 • {selectedFarm ? "LINKED" : "NO_LINK"}
                                    </div>
                                    {lastChecked && (
                                        <div className="text-xs font-mono text-white/70 bg-black/40 px-2 py-1 rounded">
                                            LAST UPDATE: {lastChecked.toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Scanning Animation */}
                            {isMonitoring && (
                                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-30">
                                    <div className="w-full h-1 bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-[scan_3s_ease-in-out_infinite]" />
                                </div>
                            )}

                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                {!isMonitoring && (
                                    <div className="text-center text-zinc-500">
                                        <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <p className="text-sm font-medium">Camera Feed Offline</p>
                                        <p className="text-xs mt-1">Start monitoring to activate feed</p>
                                    </div>
                                )}
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className={cn("w-full h-full object-cover", !isMonitoring && "hidden")}
                                />
                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                        </Card>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <Card className={cn("border-l-4 transition-all shadow-sm", 
                                presentAnimals.length > 0 ? "border-l-green-500 bg-green-500/5" : "border-l-muted")}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Present</p>
                                        <CheckCircle className="h-3.5 w-3.5 text-green-600 opacity-70" />
                                    </div>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{presentAnimals.length}</p>
                                </CardContent>
                            </Card>
                            <Card className={cn("border-l-4 transition-all shadow-sm", 
                                missingAnimals.length > 0 ? "border-l-red-500 bg-red-500/5" : "border-l-green-500")}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Missing</p>
                                        <AlertCircle className={cn("h-3.5 w-3.5 opacity-70", missingAnimals.length > 0 ? "text-red-600" : "text-green-600")} />
                                    </div>
                                    <p className="text-2xl font-bold tracking-tight text-foreground">{missingAnimals.length}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Lists (5 Cols) */}
                    <Card className="lg:col-span-5 flex flex-col border shadow-sm h-full overflow-hidden">
                        <Tabs defaultValue="missing" className="flex-1 flex flex-col w-full">
                            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <ScanFace className="h-4 w-4" />
                                    Live Detection
                                </h3>
                                <TabsList className="h-8">
                                    <TabsTrigger value="missing" className="text-xs h-6">
                                        Missing ({missingAnimals.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="present" className="text-xs h-6">
                                        Present ({presentAnimals.length})
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="missing" className="flex-1 p-0 m-0 overflow-y-auto">
                                <div className="p-4 space-y-3">
                                    {missingAnimals.length === 0 ? (
                                        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-center">
                                            <CheckCircle className="h-10 w-10 mb-3 text-green-500/50" />
                                            <p className="font-medium">All Clear!</p>
                                            <p className="text-xs">No missing animals detected</p>
                                        </div>
                                    ) : (
                                        missingAnimals.map(animal => (
                                            <AnimalCard key={animal._id} animal={animal} status="missing" />
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="present" className="flex-1 p-0 m-0 overflow-y-auto">
                                <div className="p-4 space-y-3">
                                    {presentAnimals.length === 0 ? (
                                        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-center">
                                            <Activity className="h-10 w-10 mb-3 text-muted-foreground/50" />
                                            <p className="font-medium">Waiting for Detection</p>
                                            <p className="text-xs">System scanning area...</p>
                                        </div>
                                    ) : (
                                        presentAnimals.map(animal => (
                                            <AnimalCard key={animal._id} animal={animal} status="present" />
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
