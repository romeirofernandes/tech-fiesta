import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, MapPin, Calendar } from "lucide-react";
import axios from "axios";

export default function FarmerManagement() {
  const [farmers, setFarmers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [farmersRes, farmsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/farmers`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/farms`)
      ]);

      setFarmers(farmersRes.data || []);
      setFarms(farmsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading farmer data...</div>;

  // Calculate farmer metrics
  const farmerMetrics = farmers.map(farmer => {
    const farmerFarms = farmer.farms || [];
    
    return {
      ...farmer,
      farmCount: farmerFarms.length,
      farmNames: farmerFarms.map(f => f.name),
      joinDate: new Date(farmer.createdAt).toLocaleDateString()
    };
  });

  const activeFarmers = farmers.filter(farmer => farmer.farms?.length > 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Farmers</p>
                <p className="text-2xl font-bold">{farmers.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Farmers</p>
                <p className="text-2xl font-bold">{activeFarmers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">With farms</p>
              </div>
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Farms/Farmer</p>
                <p className="text-2xl font-bold">
                  {activeFarmers.length > 0 
                    ? (farms.length / activeFarmers.length).toFixed(1)
                    : 0}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {farmers.filter(f => {
                    const date = new Date(f.createdAt);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && 
                           date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">New farmers</p>
              </div>
              <Calendar className="h-8 w-8 text-secondary-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Farmer List */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Farmers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {farmerMetrics.map((farmer) => (
              <div key={farmer._id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {farmer.imageUrl ? (
                      <img 
                        src={farmer.imageUrl} 
                        alt={farmer.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{farmer.fullName}</h3>
                      <p className="text-xs text-muted-foreground">ID: {farmer._id.slice(-6)}</p>
                    </div>
                  </div>
                  <Badge variant={farmer.farmCount > 0 ? "default" : "secondary"}>
                    {farmer.farmCount} farms
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {farmer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{farmer.email}</span>
                    </div>
                  )}
                  {farmer.phoneNumber && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{farmer.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined: {farmer.joinDate}</span>
                  </div>
                  
                  {farmer.farmNames.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-medium mb-1">Farms:</p>
                      <div className="flex flex-wrap gap-1">
                        {farmer.farmNames.map((name, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}