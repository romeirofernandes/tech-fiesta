import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, Package, Mic } from "lucide-react";
import { useUser } from "@/context/UserContext";
import axios from "axios";
import { toast } from "sonner";
import {
  PRODUCT_LABELS,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  SPECIES_PRODUCT_MAP,
} from "@/utils/biHelpers";
import { format } from "date-fns";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function ProductionTracking() {
  const { mongoUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [farms, setFarms] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [timeseries, setTimeseries] = useState([]);

  // Production dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    animalId: "",
    productType: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Voice input for hands-free record entry
  const voiceInput = useVoiceInput('production', { animals });

  useEffect(() => { fetchFarms(); }, []);
  useEffect(() => {
    if (selectedFarm) {
      fetchRecords();
      fetchAnimals();
      fetchTimeseries();
    }
  }, [selectedFarm, filterProduct]);

  // Auto-fill form when voice input parses data
  useEffect(() => {
    if (voiceInput.parsedData) {
      const d = voiceInput.parsedData;
      setForm(prev => ({
        animalId: d.animalId || prev.animalId,
        productType: d.productType || prev.productType,
        quantity: d.quantity ? String(d.quantity) : prev.quantity,
        date: d.date || prev.date,
        notes: d.notes || prev.notes,
      }));
      setDialogOpen(true);
      toast.success('Voice input processed! Review and save.');
    }
  }, [voiceInput.parsedData]);

  const handleFilterProductChange = (value) => {
    setFilterProduct(value === "__all__" ? "" : value);
  };

  // Production can't use live_animal
  const productionProductTypes = useMemo(
    () => PRODUCT_TYPES.filter(p => p !== 'live_animal'),
    []
  );

  // When an animal is selected, filter product types to what that species can produce
  const selectedAnimal = animals.find(a => a._id === form.animalId);
  const allowedProducts = useMemo(() => {
    if (!selectedAnimal) return productionProductTypes;
    const speciesProducts = SPECIES_PRODUCT_MAP[selectedAnimal.species] || [];
    return speciesProducts.length > 0 ? speciesProducts : productionProductTypes;
  }, [selectedAnimal, productionProductTypes]);

  // Reset productType if current selection not valid for new animal
  useEffect(() => {
    if (form.animalId && selectedAnimal && !allowedProducts.includes(form.productType)) {
      setForm(f => ({ ...f, productType: allowedProducts[0] || "" }));
    }
  }, [form.animalId, allowedProducts]);

  const fetchFarms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/farms`, { params: { farmerId: mongoUser._id } });
      setFarms(res.data);
      if (res.data.length > 0) {
        const userFarmIds = mongoUser?.farms?.map(f => f._id || f) || [];
        const defaultFarm = userFarmIds.length > 0 ? userFarmIds[0] : res.data[0]._id;
        setSelectedFarm(defaultFarm);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch farms:", err);
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { farmId: selectedFarm, limit: 100 };
      if (filterProduct) params.productType = filterProduct;
      const res = await axios.get(`${API_BASE}/api/production-records`, { params });
      setRecords(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAnimals = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/animals`, { params: { farmId: selectedFarm } });
      setAnimals(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTimeseries = async () => {
    try {
      const params = { farmId: selectedFarm, metric: "production", granularity: "day" };
      if (filterProduct) params.productType = filterProduct;
      const res = await axios.get(`${API_BASE}/api/bi/timeseries`, { params });
      setTimeseries(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async () => {
    try {
      await axios.post(`${API_BASE}/api/production-records`, {
        farmId: selectedFarm,
        animalId: form.animalId,
        productType: form.productType,
        quantity: Number(form.quantity),
        unit: PRODUCT_UNITS[form.productType] || "units",
        date: form.date,
        notes: form.notes,
      });
      toast.success("Production record added");
      setDialogOpen(false);
      setForm({ animalId: "", productType: "", quantity: "", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchRecords();
      fetchTimeseries();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add record");
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/production-records/${id}`);
      toast.success("Record deleted");
      fetchRecords();
      fetchTimeseries();
    } catch (err) { toast.error("Failed to delete"); }
  };

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Production Tracking</h1>
            <p className="text-muted-foreground text-sm mt-1">Record and monitor daily production output per animal</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedFarm} onValueChange={setSelectedFarm}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Select Farm" />
              </SelectTrigger>
              <SelectContent>
                {farms.map(f => <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProduct} onValueChange={handleFilterProductChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Products</SelectItem>
                {productionProductTypes.map(p => <SelectItem key={p} value={p}>{PRODUCT_LABELS[p]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Record</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Production Record</DialogTitle>
                  <DialogDescription>Log daily production for an animal. Product options are filtered based on the selected animal's species.</DialogDescription>
                </DialogHeader>
                {/* Voice Input */}
                <VoiceInputButton
                  isListening={voiceInput.isListening}
                  isProcessing={voiceInput.isProcessing}
                  isSupported={voiceInput.isSupported}
                  transcript={voiceInput.transcript}
                  error={voiceInput.error}
                  onStart={voiceInput.startListening}
                  onStop={voiceInput.stopListening}
                />
                <div className="grid gap-4 py-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Animal *</label>
                    <Select value={form.animalId} onValueChange={v => setForm({ ...form, animalId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Animal" /></SelectTrigger>
                      <SelectContent>
                        {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.species})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Product Type * {selectedAnimal && <span className="text-primary">({selectedAnimal.species} can produce: {allowedProducts.map(p => PRODUCT_LABELS[p]).join(', ')})</span>}
                    </label>
                    <Select value={form.productType} onValueChange={v => setForm({ ...form, productType: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                      <SelectContent>
                        {allowedProducts.map(p => <SelectItem key={p} value={p}>{PRODUCT_LABELS[p]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{PRODUCT_UNITS[form.productType] || "units"}</span>
                  </div>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!form.animalId || !form.productType || !form.quantity}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Timeseries Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Production Trend</CardTitle>
            <CardDescription>Daily output {filterProduct ? `(${PRODUCT_LABELS[filterProduct]})` : "(all products)"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} name="Quantity" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Production Records Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Production Records</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Animal</th>
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium text-right">Quantity</th>
                      <th className="pb-2 font-medium">Notes</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r._id} className="border-b last:border-0">
                        <td className="py-2">{format(new Date(r.date), "dd MMM yyyy")}</td>
                        <td className="py-2">{r.animalId?.name || "—"}</td>
                        <td className="py-2">
                          <Badge variant="outline">{PRODUCT_LABELS[r.productType] || r.productType}</Badge>
                        </td>
                        <td className="py-2 text-right font-medium">{r.quantity} {r.unit}</td>
                        <td className="py-2 text-muted-foreground text-xs">{r.notes || "—"}</td>
                        <td className="py-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Production Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this production record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRecord(r._id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No production records yet. Click "Add Record" to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
