import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Save, X, UploadCloud, Image as ImageIcon } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export default function Profile() {
  const { mongoUser, user, setMongoUser } = useUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    imageUrl: ""
  });
  const [farms, setFarms] = useState([]);
  const [farmDialogOpen, setFarmDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [farmForm, setFarmForm] = useState({ name: "", location: "", imageUrl: "", coordinates: null });
  const [farmImageUploading, setFarmImageUploading] = useState(false);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const profileImageInputRef = useRef(null);

  // Map marker icon fix for leaflet
  const markerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  // Fetch farms for this farmer
  useEffect(() => {
    if (mongoUser?._id) {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farms?farmerId=${mongoUser._id}`)
        .then(res => res.json())
        .then(data => setFarms(data))
        .catch(() => setFarms([]));
    }
  }, [mongoUser]);

  useEffect(() => {
    if (mongoUser) {
      setProfileForm({
        fullName: mongoUser.fullName || "",
        email: mongoUser.email || user?.email || "",
        phoneNumber: mongoUser.phoneNumber || "",
        imageUrl: mongoUser.imageUrl || ""
      });
    }
  }, [mongoUser, user]);

  // Profile image upload
  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farm-images/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setProfileForm(prev => ({ ...prev, imageUrl: data.url }));
        toast.success("Profile image uploaded!");
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setProfileImageUploading(false);
    }
  };

  // Save profile
  const handleProfileSave = async () => {
    if (!mongoUser?._id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farmers/${mongoUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMongoUser(data);
        setIsEditingProfile(false);
        toast.success("Profile updated!");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Farm image upload
  const handleFarmImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFarmImageUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farm-images/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setFarmForm(prev => ({ ...prev, imageUrl: data.url }));
        toast.success("Farm image uploaded!");
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setFarmImageUploading(false);
    }
  };

  // Create or update farm
  const handleFarmSave = async () => {
    const method = editingFarm ? "PUT" : "POST";
    const url = editingFarm
      ? `${import.meta.env.VITE_API_BASE_URL}/api/farms/${editingFarm._id}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/farms`;
    const body = { ...farmForm, farmerId: mongoUser._id };
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setFarmDialogOpen(false);
        setEditingFarm(null);
        setFarmForm({ name: "", location: "", imageUrl: "" });
        // Refresh farms
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farms?farmerId=${mongoUser._id}`)
          .then(res => res.json())
          .then(data => setFarms(data));
        toast.success(editingFarm ? "Farm updated!" : "Farm created!");
      } else {
        toast.error(data.message || "Failed to save farm");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Edit farm
  const handleEditFarm = (farm) => {
    setEditingFarm(farm);
    setFarmForm({ name: farm.name, location: farm.location, imageUrl: farm.imageUrl || "" });
    setFarmDialogOpen(true);
  };

  // Delete farm
  const handleDeleteFarm = async (farmId) => {
    if (!window.confirm("Delete this farm?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farms/${farmId}`, { method: "DELETE" });
      if (res.ok) {
        setFarms(farms.filter(f => f._id !== farmId));
        toast.success("Farm deleted!");
      } else {
        toast.error("Failed to delete farm");
      }
    } catch {
      toast.error("Network error");
    }
  };

  function LocationMarker({ value, onChange }) {
    useMapEvents({
      click(e) {
        onChange([e.latlng.lat, e.latlng.lng]);
      }
    });
    return value ? <Marker position={value} icon={markerIcon} /> : null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-12 px-4">
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileForm.imageUrl || user?.photoURL} alt={profileForm.fullName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profileForm.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              {isEditingProfile && (
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0"
                  onClick={() => profileImageInputRef.current?.click()}
                  disabled={profileImageUploading}
                >
                  <UploadCloud className="w-5 h-5" />
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </Button>
              )}
            </div>
            <div>
              <CardTitle className="text-3xl">{profileForm.fullName || "Farmer"}</CardTitle>
              <p className="text-muted-foreground">Farmer Account</p>
            </div>
            <div className="ml-auto">
              {!isEditingProfile ? (
                <Button onClick={() => setIsEditingProfile(true)} variant="outline">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => setIsEditingProfile(false)} variant="ghost">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleProfileSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                {isEditingProfile ? (
                  <Input
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
                  />
                ) : (
                  <div className="text-base">{profileForm.fullName}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                {isEditingProfile ? (
                  <Input
                    name="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  />
                ) : (
                  <div className="text-base">{profileForm.email}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                {isEditingProfile ? (
                  <Input
                    name="phoneNumber"
                    value={profileForm.phoneNumber}
                    onChange={e => setProfileForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  />
                ) : (
                  <div className="text-base">{profileForm.phoneNumber}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Your Farms</h2>
          <Button onClick={() => { setEditingFarm(null); setFarmForm({ name: "", location: "", imageUrl: "" }); setFarmDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Farm
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {farms.map(farm => (
            <Card key={farm._id} className="relative group">
              {farm.imageUrl ? (
                <img src={farm.imageUrl} alt={farm.name} className="w-full h-40 object-cover rounded-t-xl" />
              ) : (
                <div className="w-full h-40 flex items-center justify-center bg-muted rounded-t-xl">
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <CardContent className="pt-4">
                <div className="font-semibold text-lg">{farm.name}</div>
                <div className="text-muted-foreground text-sm">{farm.location}</div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleEditFarm(farm)}>
                    <Edit2 className="h-4 w-4" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteFarm(farm._id)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Farm Dialog */}
        <Dialog open={farmDialogOpen} onOpenChange={setFarmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFarm ? "Edit Farm" : "Add Farm"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Farm Name</label>
                <Input
                  value={farmForm.name}
                  onChange={e => setFarmForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Farm name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Image</label>
                <div className="flex items-center gap-4">
                  {farmForm.imageUrl && (
                    <img src={farmForm.imageUrl} alt="Farm" className="w-20 h-20 object-cover rounded-lg" />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    disabled={farmImageUploading}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <UploadCloud className="w-4 h-4" />
                      {farmImageUploading ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFarmImageChange}
                      />
                    </label>
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Farm Location (Pick on Map)</label>
                <div className="rounded-lg overflow-hidden border border-border" style={{ height: 250 }}>
                  <MapContainer
                    center={farmForm.coordinates || [20.5937, 78.9629]}
                    zoom={5}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                      value={farmForm.coordinates}
                      onChange={coords => {
                        setFarmForm(f => ({
                          ...f,
                          coordinates: coords,
                          location: `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
                        }));
                      }}
                    />
                  </MapContainer>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  value={farmForm.location}
                  onChange={e => setFarmForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Farm location (lat, lng)"
                  isInvalid={
                    !farmForm.location ||
                    !/^[-+]?\d{1,2}\.\d+,\s*[-+]?\d{1,3}\.\d+$/.test(farmForm.location)
                  }
                />
                {(!farmForm.location ||
                  !/^[-+]?\d{1,2}\.\d+,\s*[-+]?\d{1,3}\.\d+$/.test(farmForm.location)) && (
                  <div className="text-xs text-destructive mt-1">
                    Please select a location on the map.
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleFarmSave} disabled={farmImageUploading}>
                <Save className="h-4 w-4 mr-2" />
                {editingFarm ? "Save Changes" : "Create Farm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
