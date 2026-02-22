import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { BusinessLayout } from "@/components/BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Trash2, Receipt, DollarSign, ShoppingCart } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  formatINR,
  EXPENSE_LABELS,
  EXPENSE_CATEGORIES,
  PRODUCT_LABELS,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  SPECIES_COMMODITY_MAP,
  SELLABLE_SPECIES,
} from "@/utils/biHelpers";
import { format } from "date-fns";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function FinanceTracking() {
  const { mongoUser } = useUser();
  const location = useLocation();
  const isBusinessRoute = location.pathname.startsWith('/business');
  const PageLayout = isBusinessRoute ? BusinessLayout : Layout;
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [activeTab, setActiveTab] = useState("sales");

  /* ── Expense state ────────────────────────────────── */
  const [expenses, setExpenses] = useState([]);
  const [costTs, setCostTs] = useState([]);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [expForm, setExpForm] = useState({
    animalId: "", category: "feed", amount: "", description: "",
    date: new Date().toISOString().split("T")[0],
  });

  /* ── Sales state ──────────────────────────────────── */
  const [sales, setSales] = useState([]);
  const [revenueTs, setRevenueTs] = useState([]);
  const [saleDialog, setSaleDialog] = useState(false);
  const [marketPrices, setMarketPrices] = useState({});
  const [saleForm, setSaleForm] = useState({
    animalId: "", productType: "", quantity: "", pricePerUnit: "",
    date: new Date().toISOString().split("T")[0], notes: "",
  });

  // Voice input hooks for sale and expense
  const saleVoice = useVoiceInput('sale', { animals });
  const expenseVoice = useVoiceInput('expense', { animals });

  /* ── Shared effects ──────────────────────────────── */
  useEffect(() => { fetchFarms(); }, []);
  useEffect(() => {
    if (selectedFarm) {
      fetchAnimals();
      fetchExpenses();
      fetchSales();
      fetchTimeseries();
      fetchMarketPrices();
    }
  }, [selectedFarm]);

  // Auto-fill sale form from voice
  useEffect(() => {
    if (saleVoice.parsedData) {
      const d = saleVoice.parsedData;
      setSaleForm(prev => ({
        animalId: d.animalId || prev.animalId,
        productType: d.productType || prev.productType,
        quantity: d.quantity ? String(d.quantity) : prev.quantity,
        pricePerUnit: d.pricePerUnit ? String(d.pricePerUnit) : prev.pricePerUnit,
        date: d.date || prev.date,
        notes: d.notes || prev.notes,
      }));
      setSaleDialog(true);
      toast.success('Voice input processed! Review and save.');
    }
  }, [saleVoice.parsedData]);

  // Auto-fill expense form from voice
  useEffect(() => {
    if (expenseVoice.parsedData) {
      const d = expenseVoice.parsedData;
      setExpForm(prev => ({
        animalId: d.animalId || prev.animalId,
        category: d.category || prev.category,
        amount: d.amount ? String(d.amount) : prev.amount,
        description: d.description || prev.description,
        date: d.date || prev.date,
      }));
      setExpenseDialog(true);
      toast.success('Voice input processed! Review and save.');
    }
  }, [expenseVoice.parsedData]);

  /* ── Fetch helpers ───────────────────────────────── */
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

  const fetchAnimals = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/animals`, { params: { farmId: selectedFarm } });
      setAnimals(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/expenses`, { params: { farmId: selectedFarm, limit: 100 } });
      setExpenses(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSales = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sales`, { params: { farmId: selectedFarm, limit: 100 } });
      setSales(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTimeseries = async () => {
    try {
      const [costRes, revRes] = await Promise.all([
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: "cost", granularity: "day" } }),
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: "revenue", granularity: "day" } }),
      ]);
      setCostTs(costRes.data.data || []);
      setRevenueTs(revRes.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchMarketPrices = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/market-prices`, { params: { farmId: selectedFarm } });
      const priceMap = {};
      (res.data || []).forEach(p => { priceMap[p.commodity] = p; });
      setMarketPrices(priceMap);
    } catch (err) { console.error(err); }
  };

  /* ── Expense handlers ────────────────────────────── */
  const handleExpenseAnimalChange = (value) => {
    setExpForm({ ...expForm, animalId: value === "__farm__" ? "" : value });
  };

  const handleCreateExpense = async () => {
    try {
      await axios.post(`${API_BASE}/api/expenses`, {
        farmId: selectedFarm,
        animalId: expForm.animalId || null,
        category: expForm.category,
        amount: Number(expForm.amount),
        description: expForm.description,
        date: expForm.date,
      });
      toast.success("Expense recorded");
      setExpenseDialog(false);
      setExpForm({ animalId: "", category: "feed", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      fetchExpenses();
      fetchTimeseries();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/expenses/${id}`);
      toast.success("Expense deleted");
      fetchExpenses();
      fetchTimeseries();
    } catch (err) { toast.error("Failed to delete"); }
  };

  /* ── Sale helpers ────────────────────────────────── */
  const getMarketPrice = (productType, species) => {
    if (productType === "live_animal" && species) {
      const commodityKey = SPECIES_COMMODITY_MAP[species];
      if (commodityKey && marketPrices[commodityKey]) {
        return marketPrices[commodityKey].modalPrice || marketPrices[commodityKey].price;
      }
    }
    if (marketPrices[productType]) {
      return marketPrices[productType].modalPrice || marketPrices[productType].price;
    }
    return null;
  };

  const handleSaleProductChange = (value) => {
    const newForm = { ...saleForm, productType: value };
    if (value === "live_animal") {
      newForm.quantity = "1";
      // If animal already selected, try to fill price
      const animal = animals.find(a => a._id === saleForm.animalId);
      const mktPrice = getMarketPrice("live_animal", animal?.species);
      if (mktPrice) newForm.pricePerUnit = String(mktPrice);
    } else {
      const mktPrice = getMarketPrice(value);
      if (mktPrice) newForm.pricePerUnit = String(mktPrice);
    }
    setSaleForm(newForm);
  };

  const handleSaleAnimalChange = (value) => {
    const newForm = { ...saleForm, animalId: value };
    if (saleForm.productType === "live_animal") {
      const animal = animals.find(a => a._id === value);
      const mktPrice = getMarketPrice("live_animal", animal?.species);
      if (mktPrice) newForm.pricePerUnit = String(mktPrice);
    }
    setSaleForm(newForm);
  };

  const handleCreateSale = async () => {
    try {
      await axios.post(`${API_BASE}/api/sales`, {
        farmId: selectedFarm,
        animalId: saleForm.animalId || null,
        productType: saleForm.productType,
        quantity: Number(saleForm.quantity),
        pricePerUnit: Number(saleForm.pricePerUnit),
        unit: PRODUCT_UNITS[saleForm.productType] || "units",
        date: saleForm.date,
        notes: saleForm.notes,
      });
      toast.success("Sale recorded");
      setSaleDialog(false);
      setSaleForm({ animalId: "", productType: "", quantity: "", pricePerUnit: "", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchSales();
      fetchTimeseries();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to record sale"); }
  };

  const handleDeleteSale = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/sales/${id}`);
      toast.success("Sale deleted");
      fetchSales();
      fetchTimeseries();
    } catch (err) { toast.error("Failed to delete"); }
  };

  /* Filter animals for live_animal sales: only sellable species */
  const sellableAnimals = useMemo(
    () => animals.filter(a => SELLABLE_SPECIES.includes(a.species)),
    [animals],
  );

  return (
    <PageLayout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Finance Tracking</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage sales revenue and farm expenses</p>
          </div>
          <Select value={selectedFarm} onValueChange={setSelectedFarm}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select Farm" />
            </SelectTrigger>
            <SelectContent>
              {farms.map(f => <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sales"><ShoppingCart className="h-4 w-4 mr-1.5" />Sales</TabsTrigger>
            <TabsTrigger value="expenses"><Receipt className="h-4 w-4 mr-1.5" />Expenses</TabsTrigger>
          </TabsList>

          {/* ═══════════ SALES TAB ═══════════ */}
          <TabsContent value="sales" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={saleDialog} onOpenChange={setSaleDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Record Sale</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Sale</DialogTitle>
                    <DialogDescription>
                      Enter sale details. Market price auto-fills when available.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Voice Input for Sales */}
                  <VoiceInputButton
                    isListening={saleVoice.isListening}
                    isProcessing={saleVoice.isProcessing}
                    isSupported={saleVoice.isSupported}
                    transcript={saleVoice.transcript}
                    error={saleVoice.error}
                    onStart={saleVoice.startListening}
                    onStop={saleVoice.stopListening}
                  />
                  <div className="grid gap-4 py-4">
                    {/* Product Type */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Product Type *</label>
                      <Select value={saleForm.productType} onValueChange={handleSaleProductChange}>
                        <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(p => (
                            <SelectItem key={p} value={p}>{PRODUCT_LABELS[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Animal picker — for live_animal or optional otherwise */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        {saleForm.productType === "live_animal" ? "Animal to Sell *" : "Associated Animal (optional)"}
                      </label>
                      <Select value={saleForm.animalId} onValueChange={handleSaleAnimalChange}>
                        <SelectTrigger><SelectValue placeholder="Select Animal" /></SelectTrigger>
                        <SelectContent>
                          {(saleForm.productType === "live_animal" ? sellableAnimals : animals).map(a => (
                            <SelectItem key={a._id} value={a._id}>{a.name} ({a.species})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Qty + Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Quantity ({PRODUCT_UNITS[saleForm.productType] || "units"})
                        </label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={saleForm.quantity}
                          disabled={saleForm.productType === "live_animal"}
                          onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Price per unit (₹)</label>
                        <Input
                          type="number"
                          placeholder="₹"
                          value={saleForm.pricePerUnit}
                          onChange={e => setSaleForm({ ...saleForm, pricePerUnit: e.target.value })}
                        />
                      </div>
                    </div>
                    {saleForm.pricePerUnit && saleForm.quantity && (
                      <p className="text-sm text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{formatINR(Number(saleForm.pricePerUnit) * Number(saleForm.quantity))}</span>
                      </p>
                    )}

                    <Input type="date" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} />
                    <Input placeholder="Notes (optional)" value={saleForm.notes} onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateSale}
                      disabled={!saleForm.productType || !saleForm.quantity || !saleForm.pricePerUnit || (saleForm.productType === "live_animal" && !saleForm.animalId)}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Revenue Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>Daily sales revenue (INR)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTs} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatINR(v, { compact: true, decimals: 0 })} />
                      <Tooltip formatter={(v) => [formatINR(v), "Revenue"]} />
                      <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Product</th>
                          <th className="pb-2 font-medium">Animal</th>
                          <th className="pb-2 font-medium text-right">Qty</th>
                          <th className="pb-2 font-medium text-right">Price/Unit</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map(s => (
                          <tr key={s._id} className="border-b last:border-0">
                            <td className="py-2">{format(new Date(s.date), "dd MMM yyyy")}</td>
                            <td className="py-2"><Badge variant="outline">{PRODUCT_LABELS[s.productType] || s.productType}</Badge></td>
                            <td className="py-2">{s.animalId?.name || "—"}</td>
                            <td className="py-2 text-right">{s.quantity} {s.unit}</td>
                            <td className="py-2 text-right">{formatINR(s.pricePerUnit)}</td>
                            <td className="py-2 text-right font-medium">{formatINR(s.quantity * s.pricePerUnit)}</td>
                            <td className="py-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to delete this sale? This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSale(s._id)}>Delete</AlertDialogAction>
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
                    <DollarSign className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No sales recorded yet. Click "Record Sale" to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ EXPENSES TAB ═══════════ */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Expense</DialogTitle>
                    <DialogDescription>Enter expense details in INR</DialogDescription>
                  </DialogHeader>
                  {/* Voice Input for Expenses */}
                  <VoiceInputButton
                    isListening={expenseVoice.isListening}
                    isProcessing={expenseVoice.isProcessing}
                    isSupported={expenseVoice.isSupported}
                    transcript={expenseVoice.transcript}
                    error={expenseVoice.error}
                    onStart={expenseVoice.startListening}
                    onStop={expenseVoice.stopListening}
                  />
                  <div className="grid gap-4 py-4">
                    <Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{EXPENSE_LABELS[c]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 items-center">
                      <span className="text-lg">₹</span>
                      <Input type="number" placeholder="Amount" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} />
                    </div>
                    <Select value={expForm.animalId} onValueChange={handleExpenseAnimalChange}>
                      <SelectTrigger><SelectValue placeholder="Animal (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__farm__">Farm-level expense</SelectItem>
                        {animals.map(a => <SelectItem key={a._id} value={a._id}>{a.name} ({a.species})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Description" value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
                    <Input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateExpense} disabled={!expForm.amount}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Cost Trend chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Expense Trend</CardTitle>
                <CardDescription>Daily expenses (INR)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costTs} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatINR(v, { compact: true, decimals: 0 })} />
                      <Tooltip formatter={(v) => [formatINR(v), "Cost"]} />
                      <Line type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2} dot={false} name="Cost" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium">Animal</th>
                          <th className="pb-2 font-medium text-right">Amount</th>
                          <th className="pb-2 font-medium">Description</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map(e => (
                          <tr key={e._id} className="border-b last:border-0">
                            <td className="py-2">{format(new Date(e.date), "dd MMM yyyy")}</td>
                            <td className="py-2"><Badge variant="outline">{EXPENSE_LABELS[e.category]}</Badge></td>
                            <td className="py-2">{e.animalId?.name || "Farm-level"}</td>
                            <td className="py-2 text-right font-medium">{formatINR(e.amount)}</td>
                            <td className="py-2 text-muted-foreground text-xs">{e.description || "—"}</td>
                            <td className="py-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to delete this expense? This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteExpense(e._id)}>Delete</AlertDialogAction>
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
                    <Receipt className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No expenses recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
