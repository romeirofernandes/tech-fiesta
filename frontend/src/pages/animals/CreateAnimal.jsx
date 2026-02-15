import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Upload, Loader2, ChevronRight, ChevronLeft, Image as ImageIcon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { getSpeciesIcon, speciesOptions } from "@/lib/animalIcons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CreateAnimal() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [farms, setFarms] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    rfid: "",
    species: "",
    breed: "",
    gender: "",
    age: "",
    ageUnit: "months",
    farmId: "",
  });

  const [answers, setAnswers] = useState({
    hasVaccinations: "",
    lastVaccinationDate: "",
    lastVaccineName: "",
    healthStatus: "",
    pregnancyStatus: "",
    additionalInfo: "",
  });

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem("token");
      const mongoUser = localStorage.getItem("mongoUser");
      let farmerId = "";
      if (mongoUser) {
        try {
          farmerId = JSON.parse(mongoUser)._id;
        } catch (e) {
          farmerId = "";
        }
      }
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/farms?farmerId=${farmerId}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFarms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error("Failed to fetch farms");
      setFarms([]);
    }
  };

 const analyzeImageWithGemini = async (file, retryCount = 0) => {
    setAnalyzingImage(true);
    toast.info("Analyzing image with AI...", { duration: 2000 });

    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('=== CALLING GEMINI API ===');
      console.log('Image size:', base64Image.length, 'characters');

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite" 
      });

      const prompt = `You are an expert veterinarian and farm animal specialist. Analyze this image of a farm animal and extract as much information as possible Fill in ALL fields with your best professional estimate

IMPORTANT INSTRUCTIONS:
- For NAME: Suggest a fitting, cute, or common farm animal name based on the animal's appearance, a good indian domestic
- For SPECIES: Identify the exact species (cow, buffalo, goat, sheep, chicken, horse, pig, etc.)
- For BREED: Make your best estimate of the breed based on physical characteristics, color patterns, body structure, and features. Be as specific as possible.
- For GENDER: Estimate based on physical characteristics, body structure, horns/antlers, facial features
- For AGE: Provide your best estimate based on size, physical development, teeth visibility, body proportions, and other age indicators
- For AGE_UNIT: Choose the most appropriate unit (days for newborns, months for young animals, years for adults)
- For NOTES: Include any observations about health, physical condition, distinctive markings, or features

Return your analysis in this exact JSON format:
{
  "name": "a suggested name (REQUIRED - never use null)",
  "species": "the species name (REQUIRED - never use null)",
  "breed": "your best estimate of the breed (REQUIRED - be specific, never use null)",
  "gender": "male or female (make your best estimate, never use null)",
  "age": a number representing estimated age (REQUIRED - never use null),
  "ageUnit": "days, months, or years (REQUIRED - never use null)",
  "notes": "detailed observations about the animal"
}

Make educated guesses based on visible features. Never use null values. Be confident in your professional assessment.
Return ONLY valid JSON, no markdown formatting or code blocks.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      
      
      const extractedData = JSON.parse(jsonString.trim());

      if (extractedData.name && !formData.name) {
        handleInputChange("name", extractedData.name);
        console.log('✓ Filled name:', extractedData.name);
      }
      if (extractedData.species && !formData.species) {
        const speciesMap = {
          'cow': 'cow',
          'cattle': 'cow',
          'bull': 'cow',
          'calf': 'cow',
          'buffalo': 'buffalo',
          'water buffalo': 'buffalo',
          'goat': 'goat',
          'sheep': 'sheep',
          'lamb': 'sheep',
          'chicken': 'chicken',
          'rooster': 'chicken',
          'hen': 'chicken',
          'pig': 'pig',
          'piglet': 'pig',
          'hog': 'pig',
          'swine': 'pig',
          'boar': 'pig',
          'horse': 'horse',
          'equine': 'horse',
          'pony': 'horse',
        };

        const normalized = extractedData.species.toLowerCase().trim();
        const mapped = speciesMap[normalized] || normalized;
        const allowed = new Set([
          'cow',
          'buffalo',
          'goat',
          'sheep',
          'chicken',
          'pig',
          'horse',
          'other',
        ]);

        handleInputChange("species", allowed.has(mapped) ? mapped : 'other');
      }
      if (extractedData.breed && !formData.breed) {
        handleInputChange("breed", extractedData.breed);
      }
      if (extractedData.gender && !formData.gender) {
        handleInputChange("gender", extractedData.gender.toLowerCase());
      }
      if (extractedData.age && !formData.age) {
        handleInputChange("age", extractedData.age.toString());
      }
      if (extractedData.ageUnit && !formData.ageUnit) {
        const validUnits = ['days', 'months', 'years'];
        const unit = extractedData.ageUnit.toLowerCase();
        if (validUnits.includes(unit)) {
          handleInputChange("ageUnit", unit);
        }
      }

      const filledFields = [];
      if (extractedData.name) filledFields.push('name');
      if (extractedData.species) filledFields.push('species');
      if (extractedData.breed) filledFields.push('breed');
      if (extractedData.gender) filledFields.push('gender');
      if (extractedData.age) filledFields.push('age');

      toast.success(`✨ AI filled ${filledFields.length} fields: ${filledFields.join(', ')}`, { duration: 4000 });
      
      if (extractedData.notes) {
        toast.info(`AI Notes: ${extractedData.notes}`, { duration: 6000 });
      }

    } catch (error) {
     
      
      if ((error.message?.includes('429') || error.message?.includes('quota')) && retryCount < 2) {
        const waitTime = (retryCount + 1) * 3000; // 3s, 6s
        toast.info(`Rate limit reached. Retrying in ${waitTime/1000} seconds...`, { duration: waitTime });
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return analyzeImageWithGemini(file, retryCount + 1);
      }
      
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        toast.error("API rate limit reached. Please wait a moment and try again.", { duration: 5000 });
      } else {
        toast.error("Failed to analyze image. You can still fill the form manually.");
      }
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

    
      await analyzeImageWithGemini(file);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnswerChange = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter animal name");
      return false;
    }
    if (!formData.rfid.trim()) {
      toast.error("Please enter RFID");
      return false;
    }
    if (!formData.species) {
      toast.error("Please select species");
      return false;
    }
    if (!formData.breed.trim()) {
      toast.error("Please enter breed");
      return false;
    }
    if (!formData.gender) {
      toast.error("Please select gender");
      return false;
    }
    if (!formData.age || formData.age <= 0) {
      toast.error("Please enter valid age");
      return false;
    }
    if (!formData.farmId) {
      toast.error("Please select a farm");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const submitData = new FormData();

      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });

      if (imageFile) {
        submitData.append("image", imageFile);
      }

      const questionsAnswers = [
        {
          question: "Has this animal received any vaccinations previously?",
          answer: answers.hasVaccinations,
        },
        {
          question: "When was the last vaccination (if any)?",
          answer: answers.lastVaccinationDate || "Not applicable",
        },
        {
          question: "What was the last vaccination for?",
          answer: answers.lastVaccineName || "Not applicable",
        },
        {
          question: "What is the current health status of the animal?",
          answer: answers.healthStatus,
        },
      ];

      if (formData.gender === "female") {
        questionsAnswers.push({
          question: "Is the animal currently pregnant or has it given birth recently?",
          answer: answers.pregnancyStatus,
        });
      }

      if (answers.additionalInfo.trim()) {
        questionsAnswers.push({
          question: "Any additional information about the animal's health or vaccination history?",
          answer: answers.additionalInfo,
        });
      }

      submitData.append("questionsAnswers", JSON.stringify(questionsAnswers));

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("Animal created successfully!");
      navigate(`/animals/${response.data.animal._id}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Failed to create animal");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Layout>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => step === 1 ? navigate("/animals") : setStep(1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? "Back to Animals" : "Previous"}
          </Button>
          <div className="text-sm text-muted-foreground">
            Step {step} of 2
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar 
                    className="h-32 w-32 border-4 border-primary/20 cursor-pointer" 
                    onClick={() => !analyzingImage && fileInputRef.current?.click()}
                  >
                    <AvatarImage src={imagePreview} className="object-cover" />
                    <AvatarFallback className="text-6xl flex items-center justify-center">
                      {formData.species ? getSpeciesIcon(formData.species, "h-16 w-16 text-muted-foreground") : <ImageIcon className="w-12 h-12 text-muted-foreground" />}
                    </AvatarFallback>
                  </Avatar>
                  {analyzingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={analyzingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzingImage}
                >
                  {analyzingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                    </>
                  )}
                </Button>
                {imageFile && !analyzingImage && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI has analyzed your image
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Animal Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Bella"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rfid">RFID Tag *</Label>
                  <Input
                    id="rfid"
                    value={formData.rfid}
                    onChange={(e) => handleInputChange("rfid", e.target.value)}
                    placeholder="e.g., RF001234"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="species">Species *</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(value) => handleInputChange("species", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select species" />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map(({ value, label, Icon, color }) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color }} /> {label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">Breed *</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => handleInputChange("breed", e.target.value)}
                    placeholder="e.g., Holstein"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      value={formData.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                      placeholder="0"
                      className="flex-1"
                    />
                    <Select
                      value={formData.ageUnit}
                      onValueChange={(value) => handleInputChange("ageUnit", value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="farm">Farm *</Label>
                  <Select
                    value={formData.farmId}
                    onValueChange={(value) => handleInputChange("farmId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a farm" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(farms) ? farms : []).map((farm) => (
                        <SelectItem key={farm._id} value={farm._id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={farm.imageUrl} />
                              <AvatarFallback>🏡</AvatarFallback>
                            </Avatar>
                            <span>{farm.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {farms.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No farms available.{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate("/farms/create")}
                      >
                        Create one first
                      </Button>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNext} size="lg">
                  Next: Health Information
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Questionnaire */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Health & Vaccination Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                This information will help us generate a personalized vaccination schedule
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hasVaccinations">
                  Has this animal received any vaccinations previously? *
                </Label>
                <Select
                  value={answers.hasVaccinations}
                  onValueChange={(value) => handleAnswerChange("hasVaccinations", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="unknown">Not sure / Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {answers.hasVaccinations === "yes" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="lastVaccinationDate">
                      When was the last vaccination? (approximate)
                    </Label>
                    <Input
                      id="lastVaccinationDate"
                      type="date"
                      value={answers.lastVaccinationDate}
                      onChange={(e) => handleAnswerChange("lastVaccinationDate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastVaccineName">
                      What was the last vaccination for?
                    </Label>
                    <Input
                      id="lastVaccineName"
                      value={answers.lastVaccineName}
                      onChange={(e) => handleAnswerChange("lastVaccineName", e.target.value)}
                      placeholder="e.g., FMD, Brucellosis, etc."
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="healthStatus">
                  What is the current health status of the animal? *
                </Label>
                <Select
                  value={answers.healthStatus}
                  onValueChange={(value) => handleAnswerChange("healthStatus", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select health status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy">Healthy / No issues</SelectItem>
                    <SelectItem value="minor-issues">Minor health issues</SelectItem>
                    <SelectItem value="recovering">Recovering from illness</SelectItem>
                    <SelectItem value="chronic">Chronic condition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.gender === "female" && (
                <div className="space-y-2">
                  <Label htmlFor="pregnancyStatus">
                    Is the animal currently pregnant or has it given birth recently?
                  </Label>
                  <Select
                    value={answers.pregnancyStatus}
                    onValueChange={(value) => handleAnswerChange("pregnancyStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-pregnant">Not pregnant</SelectItem>
                      <SelectItem value="pregnant">Currently pregnant</SelectItem>
                      <SelectItem value="recent-birth">Recently gave birth</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">
                  Any additional information? (optional)
                </Label>
                <textarea
                  id="additionalInfo"
                  value={answers.additionalInfo}
                  onChange={(e) => handleAnswerChange("additionalInfo", e.target.value)}
                  placeholder="Any other relevant health information, previous illnesses, special care requirements, etc."
                  className="w-full min-h-25 px-3 py-2 border rounded-md bg-transparent text-sm"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !answers.hasVaccinations || !answers.healthStatus}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Animal...
                    </>
                  ) : (
                    "Create Animal"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}