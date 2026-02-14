import { useState, useEffect } from "react";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, Package } from "lucide-react";
import { useUser } from "@/context/UserContext";
import axios from "axios";
import { toast } from "sonner";
import { PRODUCT_LABELS, PRODUCT_TYPES } from "@/utils/biHelpers";
import { format } from "date-fns";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const PRODUCT_UNITS = {
  milk: "litres",
  eggs: "units",
  meat_liveweight: "kg",
  wool: "kg",
  manure: "kg",
};

export default function ProductionTracking() {
  const { mongoUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [farms, setFarms] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [timeseries, setTimeseries] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    animalId: "",
    productType: "milk",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => { fetchFarms(); }, []);
  useEffect(() => {
    if (selectedFarm) {
      fetchRecords();
      fetchAnimals();
      fetchTimeseries();
    }
  }, [selectedFarm, filterProduct]);

  const handleFilterProductChange = (value) => {
    setFilterProduct(value === "__all__" ? "" : value);
  };

  const fetchFarms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/farms`);
      setFarms(res.data);
      const userFarmIds = mongoUser?.farms?.map(f => f._id || f) || [];
      const defaultFarm = userFarmIds[0] || res.data[0]?._id;
      if (defaultFarm) setSelectedFarm(defaultFarm);
      else setLoading(false);
    } catch (err) {
      console.error(err);
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
        unit: PRODUCT_UNITS[form.productType],
        date: form.date,
        notes: form.notes,
      });
      toast.success("Production record added");
      setDialogOpen(false);
      setForm({ animalId: "", productType: "milk", quantity: "", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchRecords();
      fetchTimeseries();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add record");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    try {
      await axios.delete(`${API_BASE}/api/production-records/${id}`);
      toast.success("Deleted");
      fetchRecords();
      fetchTimeseries();
    } catch (err) { toast.error("Failed to delete"); }
  };

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Production Tracking</h1>
            <p className="text-muted-foreground text-sm mt-1">Record and monitor daily production output</p>
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
                {PRODUCT_TYPES.map(p => <SelectItem key={p} value={p}>{PRODUCT_LABELS[p]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Record</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Production Record</DialogTitle>
                  <DialogDescription>Log daily production for an animal</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Select value={form.animalId} onValueChange={v => setForm({ ...form, animalId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Animal" /></SelectTrigger>
                    <SelectContent>
                      {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.species})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.productType} onValueChange={v => setForm({ ...form, productType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map(p => <SelectItem key={p} value={p}>{PRODUCT_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 items-center">
                    <Input type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{PRODUCT_UNITS[form.productType]}</span>
                  </div>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!form.animalId || !form.quantity}>Save</Button>
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

        {/* Records Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Records</CardTitle>
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
                          <Badge variant="outline">{PRODUCT_LABELS[r.productType]}</Badge>
                        </td>
                        <td className="py-2 text-right font-medium">{r.quantity} {r.unit}</td>
                        <td className="py-2 text-muted-foreground text-xs">{r.notes || "—"}</td>
                        <td className="py-2">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
