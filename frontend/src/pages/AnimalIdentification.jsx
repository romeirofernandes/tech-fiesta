import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScanFace, Upload, Loader2, CheckCircle2, XCircle, Search } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AnimalIdentification() {
    const [farms, setFarms] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchFarms();
    }, []);

    const fetchFarms = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/farms`);
            const farmData = Array.isArray(res.data) ? res.data : [];
            setFarms(farmData);
            if (farmData.length > 0) {
                setSelectedFarm(farmData[0]._id);
            }
        } catch (err) {
            console.error("Failed to fetch farms", err);
            setError("Could not load farms. Please try again.");
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setResult(null);
            setError(null);
        }
    };

    const handleIdentify = async () => {
        if (!selectedImage || !selectedFarm) {
            setError("Please select a farm and an image.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("image", selectedImage);
            formData.append("farmId", selectedFarm);

            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.post(`${base}/api/animals/identify`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log("Identification Response:", res.data);
            setResult(res.data);
        } catch (err) {
            console.error("Identification failed", err);
            setError(err.response?.data?.message || "Identification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ScanFace className="h-8 w-8 text-primary" />
                        Animal Identification
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Identify animals using facial recognition technology.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload Image</CardTitle>
                            <CardDescription>
                                Select a farm and upload a clear image of the animal's face.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="farm">Select Farm</Label>
                                <Select value={selectedFarm} onValueChange={setSelectedFarm}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a farm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {farms.map((farm) => (
                                            <SelectItem key={farm._id} value={farm._id}>
                                                {farm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">Animal Image</Label>
                                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleImageChange}
                                    />
                                    {previewUrl ? (
                                        <div className="relative w-full aspect-video rounded-md overflow-hidden">
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Upload className="h-8 w-8" />
                                            <span>Click to upload or drag and drop</span>
                                            <span className="text-xs">Supports JPG, PNG</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleIdentify}
                                disabled={loading || !selectedImage || !selectedFarm}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Identify Animal
                                    </>
                                )}
                            </Button>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Result Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Identification Result</CardTitle>
                            <CardDescription>
                                Analysis results will appear here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p>Processing image...</p>
                                </div>
                            ) : result ? (
                                result.match ? (
                                    <div className="space-y-6">
                                        <Alert className="bg-green-500/15 text-green-700 border-green-500/30">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <AlertTitle>Match Found!</AlertTitle>
                                            <AlertDescription>
                                                Confidence: {(result.similarity * 100).toFixed(1)}%
                                            </AlertDescription>
                                        </Alert>

                                        <div className="space-y-4">
                                            <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                                                <img
                                                    src={result.animal.imageUrl}
                                                    alt={result.animal.name}
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold">{result.animal.name}</h3>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">ID:</span>
                                                        <span className="ml-2 font-medium">{result.animal.rfid}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Species:</span>
                                                        <span className="ml-2 font-medium capitalize">{result.animal.species}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Breed:</span>
                                                        <span className="ml-2 font-medium">{result.animal.breed}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Gender:</span>
                                                        <span className="ml-2 font-medium capitalize">{result.animal.gender}</span>
                                                    </div>
                                                </div>
                                                
                                                <Button 
                                                    variant="outline" 
                                                    className="w-full mt-4" 
                                                    onClick={() => navigate(`/animals/${result.animal._id}`)}
                                                >
                                                    View Full Profile
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                                        <XCircle className="h-12 w-12 text-destructive/50" />
                                        <div className="text-center">
                                            <h3 className="text-lg font-semibold text-foreground">No Match Found</h3>
                                            <p className="text-sm">
                                                Similarity: {(result.similarity * 100).toFixed(1)}% (Threshold: 80%)
                                            </p>
                                        </div>
                                        <Button variant="outline" onClick={() => { setSelectedImage(null); setPreviewUrl(null); setResult(null); }}>
                                            Try Another Image
                                        </Button>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground/50 border-2 border-dashed rounded-lg">
                                    <ScanFace className="h-12 w-12" />
                                    <p>Upload an image to start identification</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
