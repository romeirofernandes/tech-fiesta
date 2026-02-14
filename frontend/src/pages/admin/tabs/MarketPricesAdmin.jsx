import { useState, useEffect } from "react";
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
import { Plus, Trash2, Edit, Download, Loader2, RefreshCw } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
import { format } from "date-fns";
import {
  MARKET_COMMODITY_LABELS,
  MARKET_COMMODITIES,
  AGMARKNET_COMMODITIES,
} from "@/utils/biHelpers";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function MarketPricesAdmin() {
  const { mongoUser } = useUser();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCommodity, setFilterCommodity] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [importCommodity, setImportCommodity] = useState("cow");

  const [form, setForm] = useState({
    commodity: "cow",
    commodityLabel: "",
    modalPrice: "",
    minPrice: "",
    maxPrice: "",
    unit: "Rs./Unit",
    market: "",
    state: "",
    district: "",
    variety: "",
    date: new Date().toISOString().split("T")[0],
  });

  const firebaseUid = mongoUser?.firebaseUid;

  const handleFilterCommodityChange = (value) => {
    setFilterCommodity(value === "__all__" ? "" : value);
  };

  useEffect(() => { fetchPrices(); }, [filterCommodity]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filterCommodity) params.commodity = filterCommodity;
      const res = await axios.get(`${API_BASE}/api/market-prices`, { params });
      setPrices(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const payload = {
        commodity: form.commodity,
        commodityLabel: form.commodityLabel || MARKET_COMMODITY_LABELS[form.commodity],
        modalPrice: Number(form.modalPrice),
        minPrice: form.minPrice ? Number(form.minPrice) : null,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
        unit: form.unit,
        market: form.market,
        state: form.state,
        district: form.district,
        variety: form.variety,
        date: form.date,
        source: "manual",
      };

      if (editId) {
        await axios.put(`${API_BASE}/api/market-prices/${editId}`, payload);
        toast.success("Updated");
      } else {
        await axios.post(`${API_BASE}/api/market-prices`, payload);
        toast.success("Created");
      }

      setDialogOpen(false);
      resetForm();
      fetchPrices();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed";
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this market price?")) return;
    try {
      await axios.delete(`${API_BASE}/api/market-prices/${id}`);
      toast.success("Deleted");
      fetchPrices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleEdit = (p) => {
    setEditId(p._id);
    setForm({
      commodity: p.commodity,
      commodityLabel: p.commodityLabel || "",
      modalPrice: String(p.modalPrice),
      minPrice: p.minPrice != null ? String(p.minPrice) : "",
      maxPrice: p.maxPrice != null ? String(p.maxPrice) : "",
      unit: p.unit || "Rs./Quintal",
      market: p.market || "",
      state: p.state || "",
      district: p.district || "",
      variety: p.variety || "",
      date: p.date ? new Date(p.date).toISOString().split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/market-prices/import?commodity=${importCommodity}`
      );
      const data = res.data;
      if ((data.imported || 0) > 0 || (data.updated || 0) > 0) {
        const imported = data.imported || 0;
        const updated = data.updated || 0;
        const action = imported > 0 ? `Imported ${imported}` : `Updated ${updated}`;
        toast.success(`${action} price for ${data.commodityLabel || importCommodity} (${data.skipped || 0} skipped)`);
      } else if (data.message) {
        toast.info(data.message);
      } else {
        toast.info(`No new prices to import (${data.skipped} already exist)`);
      }
      fetchPrices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleImportAll = async () => {
    setImportingAll(true);
    try {
      const res = await axios.post(`${API_BASE}/api/market-prices/import-all`);
      const data = res.data;
      toast.success(
        `Imported ${data.totalImported || 0}, updated ${data.totalUpdated || 0} (${data.totalSkipped || 0} skipped) across ${data.results?.length || 0} commodities`
      );
      fetchPrices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import all failed");
    } finally {
      setImportingAll(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setForm({
      commodity: "cow",
      commodityLabel: "",
      modalPrice: "",
      minPrice: "",
      maxPrice: "",
      unit: "Rs./Unit",
      market: "",
      state: "",
      district: "",
      variety: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="space-y-6">
      {/* Import from AGMARKNET */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Import from AGMARKNET (data.gov.in)
          </CardTitle>
          <CardDescription>
            Pull latest commodity prices from the Indian government API. Date range: last 1 year to today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={importCommodity} onValueChange={setImportCommodity}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGMARKNET_COMMODITIES.map(p => (
                  <SelectItem key={p} value={p}>{MARKET_COMMODITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleImport} disabled={importing || importingAll}>
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Import Selected</>
              )}
            </Button>
            <Button variant="secondary" onClick={handleImportAll} disabled={importing || importingAll}>
              {importingAll ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Fetching All...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" /> Fetch All Prices</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Fetches livestock/poultry prices from AGMARKNET (last 1 year). Manure, Wool &amp; Goat Hair are manual-only.
          </p>
        </CardContent>
      </Card>

      {/* Filter + Add */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Select value={filterCommodity} onValueChange={handleFilterCommodityChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Commodities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Commodities</SelectItem>
              {MARKET_COMMODITIES.map(p => <SelectItem key={p} value={p}>{MARKET_COMMODITY_LABELS[p]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline">{prices.length} records</Badge>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Manual Price</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} Market Price</DialogTitle>
              <DialogDescription>Enter commodity price details in INR</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.commodity} onValueChange={v => setForm({ ...form, commodity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MARKET_COMMODITIES.map(p => <SelectItem key={p} value={p}>{MARKET_COMMODITY_LABELS[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Modal Price (₹) *</label>
                  <Input type="number" value={form.modalPrice} onChange={e => setForm({ ...form, modalPrice: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min Price (₹)</label>
                  <Input type="number" value={form.minPrice} onChange={e => setForm({ ...form, minPrice: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Price (₹)</label>
                  <Input type="number" value={form.maxPrice} onChange={e => setForm({ ...form, maxPrice: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Unit (e.g. Rs./Quintal)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                <Input placeholder="Market name" value={form.market} onChange={e => setForm({ ...form, market: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
                <Input placeholder="District" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
                <Input placeholder="Variety" value={form.variety} onChange={e => setForm({ ...form, variety: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.modalPrice}>{editId ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : prices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Commodity</th>
                    <th className="pb-2 font-medium">Market</th>
                    <th className="pb-2 font-medium">State</th>
                    <th className="pb-2 font-medium text-right">Modal (₹)</th>
                    <th className="pb-2 font-medium text-right">Min (₹)</th>
                    <th className="pb-2 font-medium text-right">Max (₹)</th>
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Source</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map(p => (
                    <tr key={p._id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2">{format(new Date(p.date), "dd MMM yyyy")}</td>
                      <td className="py-2"><Badge variant="outline">{MARKET_COMMODITY_LABELS[p.commodity] || p.commodity}</Badge></td>
                      <td className="py-2 text-xs">{p.market || "—"}</td>
                      <td className="py-2 text-xs">{p.state || "—"}</td>
                      <td className="py-2 text-right font-medium">{p.modalPrice}</td>
                      <td className="py-2 text-right">{p.minPrice ?? "—"}</td>
                      <td className="py-2 text-right">{p.maxPrice ?? "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground">{p.unit}</td>
                      <td className="py-2">
                        <Badge variant={p.source === "agmarknet" ? "default" : "secondary"} className="text-xs">
                          {p.source === "agmarknet" ? "API" : "Manual"}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No market prices found. Import from AGMARKNET or add manually.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
