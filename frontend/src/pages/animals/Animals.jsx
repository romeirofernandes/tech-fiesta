import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Filter, Trash2, Edit2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { getSpeciesIcon, speciesOptions } from "@/lib/animalIcons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function Animals() {
  const [animals, setAnimals] = useState([]);
  const [filteredAnimals, setFilteredAnimals] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnimals();
  }, []);

  useEffect(() => {
    filterAnimals();
  }, [searchQuery, selectedSpecies, animals]);

  const fetchAnimals = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAnimals(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to fetch animals");
      setLoading(false);
    }
  };

  const filterAnimals = () => {
    let filtered = Array.isArray(animals) ? animals : [];

    if (searchQuery) {
      filtered = filtered.filter(
        (animal) =>
          animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          animal.rfid.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedSpecies !== "all") {
      filtered = filtered.filter((animal) => animal.species === selectedSpecies);
    }

    setFilteredAnimals(filtered);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals/${deleteId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Animal deleted successfully");
      setDeleteId(null);
      fetchAnimals();
    } catch (error) {
      toast.error("Failed to delete animal");
      setDeleteId(null);
    }
  };


  const getAgeDisplay = (age, unit) => {
    return `${age} ${unit}`;
  };

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Animals</h1>
            <p className="text-muted-foreground mt-1">
              Manage your livestock inventory
            </p>
          </div>
          <Button onClick={() => navigate("/animals/create")} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Animal
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or RFID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    {selectedSpecies === "all" ? "All Species" : selectedSpecies}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedSpecies("all")}>
                    All Species
                  </DropdownMenuItem>
                  {speciesOptions.map(({ value, label, Icon, color }) => (
                    <DropdownMenuItem key={value} onClick={() => setSelectedSpecies(value)}>
                      <Icon className="mr-2 h-4 w-4" style={{ color }} /> {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Animals Grid */}
        {(!Array.isArray(filteredAnimals) || filteredAnimals.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4 flex items-center justify-center">{getSpeciesIcon("other", "h-16 w-16 text-muted-foreground")}</div>
              <h3 className="text-lg font-semibold mb-2">No animals found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery || selectedSpecies !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first animal"}
              </p>
              {!searchQuery && selectedSpecies === "all" && (
                <Button onClick={() => navigate("/animals/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Animal
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnimals.map((animal) => (
              <Card key={animal._id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage
                        src={animal.imageUrl}
                        alt={animal.name}
                        className="object-contain"
                      />
                      <AvatarFallback className="text-2xl flex items-center justify-center">
                        {getSpeciesIcon(animal.species, "h-8 w-8 text-muted-foreground")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {animal.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            RFID: {animal.rfid}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="capitalize">
                            {animal.species}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {animal.gender}
                          </Badge>
                          <Badge variant="outline">
                            {getAgeDisplay(animal.age, animal.ageUnit)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {animal.breed}
                        </p>
                        {animal.farmId && (
                          <div className="flex items-center gap-2 text-sm">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={animal.farmId.imageUrl} />
                              <AvatarFallback>🏡</AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground truncate">
                              {animal.farmId.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/animals/${animal._id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/animals/${animal._id}/edit`)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(animal._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you sure you want to delete this animal?
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}