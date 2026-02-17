import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Search,
  X,
  Building2,
  Users,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
  PawPrint
} from "lucide-react";
import axios from "axios";

export default function FarmerManagement() {
  const [farmers, setFarmers] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      
      const [farmersRes, animalsRes] = await Promise.all([
        axios.get(`${baseURL}/api/farmers`),
        axios.get(`${baseURL}/api/animals`)
      ]);

      setFarmers(farmersRes.data || []);
      setAnimals(animalsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  // Calculate metrics
  const activeFarmers = farmers.filter(f => f.farms?.length > 0);
  const totalFarms = farmers.reduce((sum, f) => sum + (f.farms?.length || 0), 0);
  const thisMonthFarmers = farmers.filter(f => {
    const date = new Date(f.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  // Filter farmers
  const filteredFarmers = farmers.filter(f => 
    f.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.phoneNumber?.includes(searchTerm)
  );

  // Pagination
  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFarmers = filteredFarmers.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading farmer data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "TOTAL FARMERS", val: farmers.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "ACTIVE FARMERS", val: activeFarmers.length, icon: Activity, color: "text-chart-2", bg: "bg-chart-2/10" },
          { label: "TOTAL FARMS", val: totalFarms, icon: Building2, color: "text-chart-3", bg: "bg-chart-3/10" },
          { label: "NEW THIS MONTH", val: thisMonthFarmers.length, icon: TrendingUp, color: "text-chart-4", bg: "bg-chart-4/10" },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className={`${item.bg} p-3 rounded-lg`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-bold">
              Registered Farmers ({filteredFarmers.length})
            </CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search farmers..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border font-bold text-[10px] uppercase">
                  <th className="px-6 py-3">Farmer</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Farms</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedFarmers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground italic">
                      No farmers found
                    </td>
                  </tr>
                ) : (
                  paginatedFarmers.map((farmer) => (
                    <tr key={farmer._id} className="">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {farmer.imageUrl ? (
                            <img 
                              src={farmer.imageUrl} 
                              alt={farmer.fullName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{farmer.fullName}</p>
                            <p className="text-xs text-muted-foreground font-mono">ID: {farmer._id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {farmer.email && (
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{farmer.email}</span>
                            </div>
                          )}
                          {farmer.phoneNumber && (
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <Phone className="h-3 w-3" />
                              <span>{farmer.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={farmer.farms?.length > 0 ? "default" : "secondary"}>
                          {farmer.farms?.length || 0} farms
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                        {new Date(farmer.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={farmer.farms?.length > 0 ? "default" : "outline"}>
                          {farmer.farms?.length > 0 ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFarmer(farmer)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredFarmers.length)} of {filteredFarmers.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Farmer Detail Modal */}
      {selectedFarmer && (
        <FarmerDetailModal 
          farmer={selectedFarmer}
          animals={animals}
          onClose={() => setSelectedFarmer(null)}
        />
      )}
    </div>
  );
}

function FarmerDetailModal({ farmer, animals, onClose }) {
  const farmerFarms = farmer.farms || [];
  const farmerFarmIds = farmerFarms.map(f => f._id);
  const farmerAnimals = animals.filter(a => farmerFarmIds.includes(a.farmId?._id || a.farmId));
  
  const totalAnimals = farmerAnimals.length;
  const animalsBySpecies = farmerAnimals.reduce((acc, a) => {
    acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            {farmer.imageUrl ? (
              <img 
                src={farmer.imageUrl} 
                alt={farmer.fullName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground">{farmer.fullName}</h2>
              <p className="text-sm text-muted-foreground">Farmer ID: {farmer._id}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Total Farms", val: farmerFarms.length, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
              { label: "Total Animals", val: totalAnimals, icon: PawPrint, color: "text-chart-2", bg: "bg-chart-2/10" },
              { label: "Member Since", val: new Date(farmer.createdAt).getFullYear(), icon: Calendar, color: "text-chart-3", bg: "bg-chart-3/10" },
              { label: "Status", val: farmerFarms.length > 0 ? "Active" : "Inactive", icon: Activity, color: "text-chart-4", bg: "bg-chart-4/10" },
            ].map((item, i) => (
              <div key={i} className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
                <div className={`${item.bg} p-2.5 rounded-lg`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
                  <p className="text-xl font-semibold tracking-tight text-foreground">{item.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {farmer.email && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Email</p>
                    <p className="text-sm text-foreground">{farmer.email}</p>
                  </div>
                </div>
              )}
              {farmer.phoneNumber && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Phone</p>
                    <p className="text-sm text-foreground">{farmer.phoneNumber}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Calendar className="h-5 w-5 text-chart-3" />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Joined</p>
                  <p className="text-sm text-foreground">
                    {new Date(farmer.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Farms Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                Farms ({farmerFarms.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {farmerFarms.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No farms registered</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border bg-muted/30 font-bold text-[10px] uppercase">
                        <th className="px-4 py-3">Farm Name</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Animals</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {farmerFarms.map((farm) => {
                        const farmAnimals = farmerAnimals.filter(a => 
                          (a.farmId?._id || a.farmId) === farm._id
                        );
                        return (
                          <tr key={farm._id} className="transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {farm.imageUrl ? (
                                  <img 
                                    src={farm.imageUrl} 
                                    alt={farm.name}
                                    className="w-8 h-8 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="font-medium text-foreground">{farm.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{farm.location || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary">{farmAnimals.length} animals</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                              {farm.createdAt ? new Date(farm.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Animals Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Animals ({totalAnimals})
                </CardTitle>
                {Object.keys(animalsBySpecies).length > 0 && (
                  <div className="flex gap-2">
                    {Object.entries(animalsBySpecies).map(([species, count]) => (
                      <Badge key={species} variant="outline" className="text-xs">
                        {species}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {totalAnimals === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No animals registered</p>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-muted-foreground border-b border-border bg-muted/30 font-bold text-[10px] uppercase">
                        <th className="px-4 py-3">Animal</th>
                        <th className="px-4 py-3">RFID</th>
                        <th className="px-4 py-3">Species</th>
                        <th className="px-4 py-3">Breed</th>
                        <th className="px-4 py-3">Gender</th>
                        <th className="px-4 py-3">Farm</th>
                        <th className="px-4 py-3">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {farmerAnimals.map((animal) => (
                        <tr key={animal._id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {animal.imageUrl ? (
                                <img 
                                  src={animal.imageUrl} 
                                  alt={animal.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                  <PawPrint className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium text-foreground">{animal.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {animal.rfid || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">{animal.species}</td>
                          <td className="px-4 py-3 text-muted-foreground">{animal.breed || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize text-xs">
                              {animal.gender}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {animal.farmId?.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {animal.age} {animal.ageUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}