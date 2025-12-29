import { useState, useEffect } from "react"
import { Layout } from "@/components/Layout"
import { useUser } from "@/context/UserContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Mail, Phone, MapPin, Edit2, Save, X } from "lucide-react"
import { toast } from "sonner"

export default function Profile() {
  const { mongoUser, user, setMongoUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mongoUser) {
      setFormData({
        fullName: mongoUser.fullName || "",
        email: mongoUser.email || user?.email || "",
        phoneNumber: mongoUser.phoneNumber || ""
      });
    }
  }, [mongoUser, user]);

  // Fallback initials
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!mongoUser?._id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/farmers/${mongoUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMongoUser(data);
        toast.success("Profile updated successfully");
        setIsEditing(false);
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
    if (mongoUser) {
      setFormData({
        fullName: mongoUser.fullName || "",
        email: mongoUser.email || user?.email || "",
        phoneNumber: mongoUser.phoneNumber || ""
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-4xl font-bold mb-1">Profile</h1>
                <p className="text-muted-foreground">Manage your account information</p>
            </div>
            {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                </Button>
            ) : (
                <div className="flex gap-2">
                    <Button onClick={handleCancel} variant="ghost" disabled={loading}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </Button>
                </div>
            )}
        </div>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b pb-6">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.photoURL} alt={mongoUser?.fullName} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(mongoUser?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{mongoUser?.fullName || "Farmer"}</CardTitle>
                  <p className="text-muted-foreground">Farmer Account</p>
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Full Name</span>
                  </div>
                  {isEditing ? (
                      <Input 
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full"
                          placeholder="Enter full name"
                      />
                  ) : (
                      <p className="text-base font-medium pl-6">{mongoUser?.fullName || "Not provided"}</p>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email Address</span>
                  </div>
                  {isEditing ? (
                      <Input 
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full"
                          placeholder="Enter email address"
                      />
                  ) : (
                      <p className="text-base font-medium pl-6">{user?.email || mongoUser?.email || "Not provided"}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Phone Number</span>
                  </div>
                  {isEditing ? (
                    <Input 
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full"
                        placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-base font-medium pl-6">{mongoUser?.phoneNumber || "Not provided"}</p>
                  )}
                </div>

                {mongoUser?.location && (
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Location</span>
                    </div>
                    <p className="text-base font-medium pl-6">{mongoUser.location}</p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
