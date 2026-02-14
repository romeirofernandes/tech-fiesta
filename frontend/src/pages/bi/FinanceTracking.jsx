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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, DollarSign, Receipt } from "lucide-react";
import { useUser } from "@/context/UserContext";
import axios from "axios";
import { toast } from "sonner";
import { formatINR, PRODUCT_LABELS, PRODUCT_TYPES, EXPENSE_LABELS, EXPENSE_CATEGORIES } from "@/utils/biHelpers";
import { format } from "date-fns";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function FinanceTracking() {
  const { mongoUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [activeTab, setActiveTab] = useState("expenses");

  // Data
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [costTs, setCostTs] = useState([]);
  const [revTs, setRevTs] = useState([]);

  // Dialogs
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [saleDialog, setSaleDialog] = useState(false);

  const [expForm, setExpForm] = useState({ animalId: "", category: "feed", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [saleForm, setSaleForm] = useState({ productType: "milk", quantity: "", pricePerUnit: "", buyerName: "", date: new Date().toISOString().split("T")[0], notes: "" });

  const handleExpenseAnimalChange = (value) => {
    setExpForm({ ...expForm, animalId: value === "__farm__" ? "" : value });
  };

  useEffect(() => { fetchFarms(); }, []);
  useEffect(() => {
    if (selectedFarm) {
      fetchExpenses();
      fetchSales();
      fetchTimeseries();
      fetchAnimals();
    }
  }, [selectedFarm]);

  const fetchFarms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/farms`);
      setFarms(res.data);
      const userFarmIds = mongoUser?.farms?.map(f => f._id || f) || [];
      const defaultFarm = userFarmIds[0] || res.data[0]?._id;
      if (defaultFarm) setSelectedFarm(defaultFarm);
      else setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
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
      const [c, r] = await Promise.all([
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: "cost", granularity: "day" } }),
        axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: "revenue", granularity: "day" } }),
      ]);
      setCostTs(c.data.data || []);
      setRevTs(r.data.data || []);
    } catch (err) { console.error(err); }
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

  const handleCreateSale = async () => {
    try {
      const qty = Number(saleForm.quantity);
      const ppu = Number(saleForm.pricePerUnit);
      await axios.post(`${API_BASE}/api/sales`, {
        farmId: selectedFarm,
        productType: saleForm.productType,
        quantity: qty,
        pricePerUnit: ppu,
        totalAmount: qty * ppu,
        buyerName: saleForm.buyerName,
        date: saleForm.date,
        notes: saleForm.notes,
      });
      toast.success("Sale recorded");
      setSaleDialog(false);
      setSaleForm({ productType: "milk", quantity: "", pricePerUnit: "", buyerName: "", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchSales();
      fetchTimeseries();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try { await axios.delete(`${API_BASE}/api/expenses/${id}`); toast.success("Deleted"); fetchExpenses(); fetchTimeseries(); }
    catch { toast.error("Failed"); }
  };

  const handleDeleteSale = async (id) => {
    if (!confirm("Delete this sale?")) return;
    try { await axios.delete(`${API_BASE}/api/sales/${id}`); toast.success("Deleted"); fetchSales(); fetchTimeseries(); }
    catch { toast.error("Failed"); }
  };

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Finance Tracking</h1>
            <p className="text-muted-foreground text-sm mt-1">Expenses, sales & profitability</p>
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

        {/* Revenue vs Cost chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue vs Cost</CardTitle>
            <CardDescription>Daily comparison (INR)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} allowDuplicatedCategory={false} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatINR(v, { compact: true, decimals: 0 })} />
                  <Tooltip formatter={(v) => [formatINR(v)]} />
                  <Line data={revTs} type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue" />
                  <Line data={costTs} type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2} dot={false} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {activeTab === "expenses" && (
                <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Expense</DialogTitle>
                      <DialogDescription>Enter expense details in INR</DialogDescription>
                    </DialogHeader>
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
              )}
              {activeTab === "sales" && (
                <Dialog open={saleDialog} onOpenChange={setSaleDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Sale</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Sale</DialogTitle>
                      <DialogDescription>Enter sale details in INR</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Select value={saleForm.productType} onValueChange={v => setSaleForm({ ...saleForm, productType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(p => <SelectItem key={p} value={p}>{PRODUCT_LABELS[p]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="Quantity" value={saleForm.quantity} onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })} />
                      <div className="flex gap-2 items-center">
                        <span className="text-lg">₹</span>
                        <Input type="number" placeholder="Price per unit" value={saleForm.pricePerUnit} onChange={e => setSaleForm({ ...saleForm, pricePerUnit: e.target.value })} />
                      </div>
                      {saleForm.quantity && saleForm.pricePerUnit && (
                        <p className="text-sm text-muted-foreground">Total: {formatINR(Number(saleForm.quantity) * Number(saleForm.pricePerUnit))}</p>
                      )}
                      <Input placeholder="Buyer name (optional)" value={saleForm.buyerName} onChange={e => setSaleForm({ ...saleForm, buyerName: e.target.value })} />
                      <Input type="date" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} />
                      <Input placeholder="Notes (optional)" value={saleForm.notes} onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateSale} disabled={!saleForm.quantity || !saleForm.pricePerUnit}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <TabsContent value="expenses" className="mt-4">
            <Card>
              <CardContent className="pt-4">
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
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(e._id)}>
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
                    <Receipt className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No expenses recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {sales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Product</th>
                          <th className="pb-2 font-medium text-right">Qty</th>
                          <th className="pb-2 font-medium text-right">Price/Unit</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                          <th className="pb-2 font-medium">Buyer</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map(s => (
                          <tr key={s._id} className="border-b last:border-0">
                            <td className="py-2">{format(new Date(s.date), "dd MMM yyyy")}</td>
                            <td className="py-2"><Badge variant="outline">{PRODUCT_LABELS[s.productType]}</Badge></td>
                            <td className="py-2 text-right">{s.quantity} {s.unit}</td>
                            <td className="py-2 text-right">{formatINR(s.pricePerUnit)}</td>
                            <td className="py-2 text-right font-medium">{formatINR(s.totalAmount)}</td>
                            <td className="py-2 text-muted-foreground text-xs">{s.buyerName || "—"}</td>
                            <td className="py-2">
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteSale(s._id)}>
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
                    <DollarSign className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No sales recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
