import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  Search,
  Pencil,
  RotateCcw,
  Save,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL;

const SPECIES_EMOJIS = {
  cow: "🐄",
  buffalo: "🐃",
  goat: "🐐",
  sheep: "🐑",
  chicken: "🐔",
  pig: "🐷",
  horse: "🐴",
  other: "🐾",
};

export default function HeartRateThresholds() {
  const [animals, setAnimals] = useState([]);
  const [defaults, setDefaults] = useState({});
  const [customThresholds, setCustomThresholds] = useState({});
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterFarm, setFilterFarm] = useState("all");
  const [filterCustom, setFilterCustom] = useState("all");

  // Editing
  const [editingAnimalId, setEditingAnimalId] = useState(null);
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirm reset dialog
  const [resetAnimal, setResetAnimal] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [animalsRes, defaultsRes, thresholdsRes, farmsRes] =
        await Promise.all([
          axios.get(`${BASE}/api/animals`).catch(() => ({ data: [] })),
          axios
            .get(`${BASE}/api/heart-rate-thresholds/defaults`)
            .catch(() => ({ data: {} })),
          axios
            .get(`${BASE}/api/heart-rate-thresholds`)
            .catch(() => ({ data: [] })),
          axios.get(`${BASE}/api/farms`).catch(() => ({ data: [] })),
        ]);

      setAnimals(Array.isArray(animalsRes.data) ? animalsRes.data : []);
      setDefaults(defaultsRes.data || {});
      setFarms(Array.isArray(farmsRes.data) ? farmsRes.data : []);

      // Build map of customThresholds keyed by animalId
      const customMap = {};
      const thresholdList = Array.isArray(thresholdsRes.data)
        ? thresholdsRes.data
        : [];
      thresholdList.forEach((t) => {
        const id =
          typeof t.animalId === "object" ? t.animalId._id : t.animalId;
        if (id) {
          customMap[id] = { minBPM: t.minBPM, maxBPM: t.maxBPM };
        }
      });
      setCustomThresholds(customMap);
    } catch (error) {
      console.error("Error fetching HR threshold data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get effective thresholds for an animal
  const getThresholds = (animal) => {
    const custom = customThresholds[animal._id];
    if (custom) {
      return {
        min: custom.minBPM,
        max: custom.maxBPM,
        isCustom: true,
      };
    }
    const speciesDefaults = defaults[animal.species] || defaults.other || {};
    return {
      min: speciesDefaults.min || 60,
      max: speciesDefaults.max || 100,
      isCustom: false,
    };
  };

  // Filter animals
  const filteredAnimals = animals.filter((animal) => {
    if (search) {
      const s = search.toLowerCase();
      const matchName = animal.name?.toLowerCase().includes(s);
      const matchRfid = animal.rfid?.toLowerCase().includes(s);
      if (!matchName && !matchRfid) return false;
    }
    if (filterSpecies !== "all" && animal.species !== filterSpecies)
      return false;
    if (filterFarm !== "all") {
      const farmId =
        typeof animal.farmId === "object"
          ? animal.farmId?._id
          : animal.farmId;
      if (farmId !== filterFarm) return false;
    }
    if (filterCustom !== "all") {
      const isCustom = !!customThresholds[animal._id];
      if (filterCustom === "custom" && !isCustom) return false;
      if (filterCustom === "default" && isCustom) return false;
    }
    return true;
  });

  // Get unique species from animals
  const allSpecies = [...new Set(animals.map((a) => a.species))].filter(
    Boolean
  );

  // Start editing
  const startEdit = (animal) => {
    const t = getThresholds(animal);
    setEditingAnimalId(animal._id);
    setEditMin(String(t.min));
    setEditMax(String(t.max));
  };

  const cancelEdit = () => {
    setEditingAnimalId(null);
    setEditMin("");
    setEditMax("");
  };

  // Save custom threshold
  const handleSave = async (animalId) => {
    const minBPM = parseFloat(editMin);
    const maxBPM = parseFloat(editMax);

    if (isNaN(minBPM) || isNaN(maxBPM)) {
      toast.error("Please enter valid numbers");
      return;
    }
    if (minBPM >= maxBPM) {
      toast.error("Min BPM must be less than Max BPM");
      return;
    }
    if (minBPM < 0 || maxBPM > 500) {
      toast.error("BPM values must be between 0 and 500");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${BASE}/api/heart-rate-thresholds/${animalId}`, {
        minBPM,
        maxBPM,
      });
      setCustomThresholds((prev) => ({
        ...prev,
        [animalId]: { minBPM, maxBPM },
      }));
      cancelEdit();
      toast.success("Custom threshold saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save threshold");
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!resetAnimal) return;
    try {
      await axios.delete(
        `${BASE}/api/heart-rate-thresholds/${resetAnimal._id}`
      );
      setCustomThresholds((prev) => {
        const next = { ...prev };
        delete next[resetAnimal._id];
        return next;
      });
      setResetAnimal(null);
      toast.success("Reset to species default");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to reset threshold"
      );
    }
  };

  const customCount = Object.keys(customThresholds).length;

  return (
    <div className="space-y-6">
      {/* Species Defaults Reference */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Species Default Ranges (BPM)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(defaults).map(([species, range]) => (
              <Badge
                key={species}
                variant="outline"
                className="text-xs capitalize gap-1.5 py-1 px-2.5"
              >
                <span>{SPECIES_EMOJIS[species] || "🐾"}</span>
                <span className="font-medium">{species}</span>
                <span className="text-muted-foreground font-mono">
                  {range.min}–{range.max}
                </span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-lg">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                TOTAL ANIMALS
              </p>
              <p className="text-xl font-semibold">{animals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-chart-2/10 p-2.5 rounded-lg">
              <Pencil className="h-4 w-4 text-chart-2" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                CUSTOM THRESHOLDS
              </p>
              <p className="text-xl font-semibold">{customCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-muted p-2.5 rounded-lg">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                USING DEFAULTS
              </p>
              <p className="text-xl font-semibold">
                {animals.length - customCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or RFID..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Species
              </Label>
              <Select value={filterSpecies} onValueChange={setFilterSpecies}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  {allSpecies.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {SPECIES_EMOJIS[s] || "🐾"} {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[160px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Farm
              </Label>
              <Select value={filterFarm} onValueChange={setFilterFarm}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farms</SelectItem>
                  {farms.map((f) => (
                    <SelectItem key={f._id} value={f._id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Threshold
              </Label>
              <Select value={filterCustom} onValueChange={setFilterCustom}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="custom">Custom Only</SelectItem>
                  <SelectItem value="default">Default Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch("");
                setFilterSpecies("all");
                setFilterFarm("all");
                setFilterCustom("all");
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Animal</TableHead>
                <TableHead>RFID</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Farm</TableHead>
                <TableHead className="text-center">
                  Default Range (BPM)
                </TableHead>
                <TableHead className="text-center">
                  Active Range (BPM)
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredAnimals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No animals found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnimals.map((animal) => {
                  const t = getThresholds(animal);
                  const speciesDefault =
                    defaults[animal.species] || defaults.other || {};
                  const isEditing = editingAnimalId === animal._id;
                  const farmName =
                    typeof animal.farmId === "object"
                      ? animal.farmId?.name
                      : farms.find((f) => f._id === animal.farmId)?.name;

                  return (
                    <TableRow key={animal._id}>
                      <TableCell className="pl-4 font-medium">
                        {animal.name || "Unnamed"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {animal.rfid || "—"}
                      </TableCell>
                      <TableCell className="capitalize">
                        <span className="mr-1">
                          {SPECIES_EMOJIS[animal.species] || "🐾"}
                        </span>
                        {animal.species}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {farmName || "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm text-muted-foreground">
                        {speciesDefault.min || "—"}–
                        {speciesDefault.max || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <Input
                              type="number"
                              value={editMin}
                              onChange={(e) => setEditMin(e.target.value)}
                              className="w-16 h-7 text-xs text-center font-mono"
                              placeholder="Min"
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                              type="number"
                              value={editMax}
                              onChange={(e) => setEditMax(e.target.value)}
                              className="w-16 h-7 text-xs text-center font-mono"
                              placeholder="Max"
                            />
                          </div>
                        ) : (
                          <span
                            className={`font-mono text-sm ${
                              t.isCustom
                                ? "text-primary font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {t.min}–{t.max}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.isCustom ? (
                          <Badge
                            variant="default"
                            className="text-[10px] font-bold uppercase"
                          >
                            Custom
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase"
                          >
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleSave(animal._id)}
                                disabled={saving}
                              >
                                <Save className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={cancelEdit}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => startEdit(animal)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {t.isCustom && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setResetAnimal(animal)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Result count */}
          {!loading && (
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Showing {filteredAnimals.length} of {animals.length} animals
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={!!resetAnimal}
        onOpenChange={(open) => !open && setResetAnimal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Default</DialogTitle>
            <DialogDescription>
              Remove the custom heart rate threshold for{" "}
              <strong>{resetAnimal?.name || "this animal"}</strong> and revert
              to the species default (
              {defaults[resetAnimal?.species]?.min || "—"}–
              {defaults[resetAnimal?.species]?.max || "—"} BPM)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetAnimal(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset to Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
