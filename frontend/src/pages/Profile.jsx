import { Layout } from "@/components/Layout"
import { useUser } from "@/context/UserContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Phone, MapPin } from "lucide-react"

export default function Profile() {
  const { mongoUser, user } = useUser();

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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.photoURL} alt={mongoUser?.fullName} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(mongoUser?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <CardTitle className="text-2xl">{mongoUser?.fullName || "Farmer"}</CardTitle>
              <p className="text-muted-foreground">Farmer Account</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 mt-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Full Name</span>
                <span className="font-medium">{mongoUser?.fullName || "Not provided"}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Email Address</span>
                <span className="font-medium">{user?.email || mongoUser?.email || "Not provided"}</span>
              </div>
            </div>

            {mongoUser?.phoneNumber && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Phone Number</span>
                  <span className="font-medium">{mongoUser.phoneNumber}</span>
                </div>
              </div>
            )}

            {mongoUser?.location && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Location</span>
                  <span className="font-medium">{mongoUser.location}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
