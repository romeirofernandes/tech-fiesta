import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  PawPrint,
  MapPin,
  Eye,
  Loader2,
  Edit,
  Trash2
} from "lucide-react";

export default function FarmerManagement() {
  const [farmers, setFarmers] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      
      const [farmersRes, animalsRes] = await Promise.all([
        fetch(`${baseURL}/api/farmers`).then(r => r.json()),
        fetch(`${baseURL}/api/animals`).then(r => r.json())
      ]);

      setFarmers(farmersRes || []);
      setAnimals(animalsRes || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const activeFarmers = farmers.filter(f => f.farms?.length > 0);
  const totalFarms = farmers.reduce((sum, f) => sum + (f.farms?.length || 0), 0);
  const totalAnimals = animals.length;

  const filteredFarmers = farmers.filter(f => {
    const matchesSearch = f.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.phoneNumber?.includes(searchTerm);
    
    const matchesStatus = !statusFilter || 
      (statusFilter === "active" && f.farms?.length > 0) ||
      (statusFilter === "inactive" && (!f.farms || f.farms.length === 0));
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFarmers = filteredFarmers.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterStatusChange = (value) => {
    setStatusFilter(value === "__all__" ? "" : value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      

      {/* Filter + Search */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={handleFilterStatusChange}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{filteredFarmers.length} records</Badge>
        </div>

        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search farmers..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedFarmers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Farmer</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium">Farms</th>
                    <th className="pb-2 font-medium">Animals</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFarmers.map((farmer) => {
                    const farmerFarmIds = (farmer.farms || []).map(f => f._id);
                    const farmerAnimals = animals.filter(a => 
                      farmerFarmIds.includes(a.farmId?._id || a.farmId)
                    );

                    return (
                      <tr key={farmer._id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 text-xs text-muted-foreground">
                          {new Date(farmer.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {farmer.imageUrl ? (
                              <img 
                                src={farmer.imageUrl} 
                                alt={farmer.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{farmer.fullName}</p>
                              <p className="text-xs text-muted-foreground">ID: {farmer._id.slice(-6)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 text-xs">{farmer.email || "—"}</td>
                        <td className="py-2 text-xs">{farmer.phoneNumber || "—"}</td>
                        <td className="py-2">
                          <Badge variant="outline">{farmer.farms?.length || 0}</Badge>
                        </td>
                        <td className="py-2">{farmerAnimals.length}</td>
                        <td className="py-2">
                          <Badge variant={farmer.farms?.length > 0 ? "default" : "secondary"}>
                            {farmer.farms?.length > 0 ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedFarmer(farmer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No farmers found. Try adjusting your search.
            </div>
          )}

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
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
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
      <div className="bg-card border rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
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
              <h2 className="text-2xl font-bold">{farmer.fullName}</h2>
              <p className="text-sm text-muted-foreground">Farmer ID: {farmer._id}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Farms</p>
                <p className="text-2xl font-bold">{farmerFarms.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Animals</p>
                <p className="text-2xl font-bold">{totalAnimals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="text-lg font-bold">
                  {new Date(farmer.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short'
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold">{farmerFarms.length > 0 ? "Active" : "Inactive"}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                  <p className="text-sm">{farmer.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                  <p className="text-sm">{farmer.phoneNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Registration Date</p>
                  <p className="text-sm">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Farms ({farmerFarms.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {farmerFarms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No farms registered</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Farm Name</th>
                        <th className="pb-2 font-medium">Location</th>
                        <th className="pb-2 font-medium">Animals</th>
                        <th className="pb-2 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerFarms.map((farm) => {
                        const farmAnimals = farmerAnimals.filter(a => 
                          (a.farmId?._id || a.farmId) === farm._id
                        );
                        return (
                          <tr key={farm._id} className="border-b last:border-0">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                {farm.imageUrl ? (
                                  <img src={farm.imageUrl} alt={farm.name} className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="font-medium">{farm.name}</span>
                              </div>
                            </td>
                            <td className="py-2 text-xs">{farm.location || "—"}</td>
                            <td className="py-2">
                              <Badge variant="secondary">{farmAnimals.length}</Badge>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {farm.createdAt ? new Date(farm.createdAt).toLocaleDateString() : "—"}
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

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Animals ({totalAnimals})</CardTitle>
                {Object.keys(animalsBySpecies).length > 0 && (
                  <div className="flex gap-2">
                    {Object.entries(animalsBySpecies).map(([species, count]) => (
                      <Badge key={species} variant="outline" className="text-xs capitalize">
                        {species}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {totalAnimals === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No animals registered</p>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Animal</th>
                        <th className="pb-2 font-medium">RFID</th>
                        <th className="pb-2 font-medium">Species</th>
                        <th className="pb-2 font-medium">Breed</th>
                        <th className="pb-2 font-medium">Gender</th>
                        <th className="pb-2 font-medium">Farm</th>
                        <th className="pb-2 font-medium">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerAnimals.map((animal) => (
                        <tr key={animal._id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              {animal.imageUrl ? (
                                <img src={animal.imageUrl} alt={animal.name} className="w-8 h-8 rounded object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                  <PawPrint className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">{animal.name}</span>
                            </div>
                          </td>
                          <td className="py-2 text-xs font-mono">{animal.rfid || "—"}</td>
                          <td className="py-2 text-xs capitalize">{animal.species}</td>
                          <td className="py-2 text-xs">{animal.breed || "—"}</td>
                          <td className="py-2">
                            <Badge variant="outline" className="capitalize text-xs">
                              {animal.gender}
                            </Badge>
                          </td>
                          <td className="py-2 text-xs">{animal.farmId?.name || "—"}</td>
                          <td className="py-2 text-xs">{animal.age} {animal.ageUnit}</td>
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