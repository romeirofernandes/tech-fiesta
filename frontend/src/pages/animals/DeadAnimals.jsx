import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { useUser } from "@/context/UserContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSpeciesIcon } from "@/lib/animalIcons";
import { Input } from "@/components/ui/input";

export default function DeadAnimals() {
  const { mongoUser } = useUser();
  const [deadAnimals, setDeadAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (mongoUser) {
      fetchDeadAnimals();
    }
  }, [mongoUser]);

  const fetchDeadAnimals = async () => {
    if (!mongoUser) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/animals/dead`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { farmerId: mongoUser._id }
        }
      );
      setDeadAnimals(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch records");
      setLoading(false);
    }
  };

  const filteredAnimals = deadAnimals.filter(animal => 
    animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.rfid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="text-right">
             <h1 className="text-3xl font-bold">Memorial Records</h1>
          </div>
        </div>

        <Card>
            <CardContent className="pt-6">
                <div className="relative max-w-sm mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or RFID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Age at Passing</TableHead>
                      <TableHead>Date of Passing</TableHead>
                      <TableHead>Cause</TableHead>
                      <TableHead className="text-right">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnimals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                           No memorial records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAnimals.map((animal) => (
                        <TableRow key={animal._id}>
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={animal.imageUrl} alt={animal.name} />
                              <AvatarFallback>{getSpeciesIcon(animal.species, "h-4 w-4")}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>{animal.name}</div>
                            <div className="text-xs text-muted-foreground">{animal.rfid}</div>
                          </TableCell>
                          <TableCell>
                            {animal.ageAtDeath} {animal.ageUnit}
                          </TableCell>
                          <TableCell>
                            {new Date(animal.deathDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{animal.causeOfDeath || "Unknown"}</TableCell>
                          <TableCell className="text-right max-w-[200px] truncate">
                            {animal.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
