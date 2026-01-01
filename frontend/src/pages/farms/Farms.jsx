import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit2, Eye, MapPin, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function Farms() {
  const [farms, setFarms] = useState([]);
  const [filteredFarms, setFilteredFarms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    filterFarms();
  }, [searchQuery, farms]);

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/farms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFarms(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch farms");
      setLoading(false);
    }
  };

  const filterFarms = () => {
    let filtered = Array.isArray(farms) ? farms : [];

    if (searchQuery) {
      filtered = filtered.filter((farm) =>
        farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farm.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFarms(filtered);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/farms/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Farm deleted successfully");
      setDeleteId(null);
      fetchFarms();
    } catch (error) {
      toast.error("Failed to delete farm");
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading farms...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Farms</h1>
            <p className="text-muted-foreground mt-1">
              Manage your farm locations
            </p>
          </div>
          <Button onClick={() => navigate("/farms/create")} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Farm
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {(!Array.isArray(filteredFarms) || filteredFarms.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No farms found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Get started by adding your first farm"}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate("/farms/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Farm
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFarms.map((farm) => (
              <Card key={farm._id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative h-48 bg-muted">
                  {farm.imageUrl ? (
                    <img
                      src={farm.imageUrl}
                      alt={farm.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg truncate">{farm.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{farm.location}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/farms/${farm._id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/farms/${farm._id}/edit`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(farm._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you sure you want to delete this farm?
                            </AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteId(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}