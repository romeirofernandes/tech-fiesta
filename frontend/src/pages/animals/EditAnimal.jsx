import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditAnimal() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [farms, setFarms] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    rfid: "",
    species: "",
    breed: "",
    gender: "",
    age: "",
    ageUnit: "months",
    farmId: "",
    imageUrl: "",
  });

  useEffect(() => {
    fetchAnimal();
    fetchFarms();
  }, [id]);

  const fetchAnimal = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const animal = response.data.animal;
      setFormData({
        name: animal.name,
        rfid: animal.rfid,
        species: animal.species,
        breed: animal.breed,
        gender: animal.gender,
        age: animal.age,
        ageUnit: animal.ageUnit,
        farmId: animal.farmId._id,
        imageUrl: animal.imageUrl,
      });
      setImagePreview(animal.imageUrl);
      setFetching(false);
    } catch (error) {
      toast.error("Failed to fetch animal details");
      navigate("/animals");
    }
  };

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/farms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFarms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error("Failed to fetch farms");
      setFarms([]); 
    }
  };

  const handleImageChange = (e) => {
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
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const submitData = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key !== "imageUrl") {
          submitData.append(key, formData[key]);
        }
      });

      if (imageFile) {
        submitData.append("image", imageFile);
      }

      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals/${id}`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("Animal updated successfully!");
      navigate(`/animals/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update animal");
    } finally {
      setLoading(false);
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

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(`/animals/${id}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Animal
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Animal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-primary/20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <AvatarImage src={imagePreview} className="object-contain"/>
                  <AvatarFallback className="text-6xl flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Animal Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rfid">RFID Tag *</Label>
                  <Input
                    id="rfid"
                    value={formData.rfid}
                    onChange={(e) => handleInputChange("rfid", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="species">Species *</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(value) => handleInputChange("species", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cow">🐄 Cow</SelectItem>
                      <SelectItem value="buffalo">🐃 Buffalo</SelectItem>
                      <SelectItem value="goat">🐐 Goat</SelectItem>
                      <SelectItem value="sheep">🐑 Sheep</SelectItem>
                      <SelectItem value="chicken">🐔 Chicken</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">Breed *</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => handleInputChange("breed", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                      required
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map((farm) => (
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
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/animals/${id}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}