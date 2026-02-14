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
import { Plus, Trash2, Receipt } from "lucide-react";
import { useUser } from "@/context/UserContext";
import axios from "axios";
import { toast } from "sonner";
import { formatINR, EXPENSE_LABELS, EXPENSE_CATEGORIES } from "@/utils/biHelpers";
import { format } from "date-fns";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function FinanceTracking() {
  const { mongoUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");

  // Data
  const [expenses, setExpenses] = useState([]);
  const [costTs, setCostTs] = useState([]);

  // Dialog
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [expForm, setExpForm] = useState({ animalId: "", category: "feed", amount: "", description: "", date: new Date().toISOString().split("T")[0] });

  const handleExpenseAnimalChange = (value) => {
    setExpForm({ ...expForm, animalId: value === "__farm__" ? "" : value });
  };

  useEffect(() => { fetchFarms(); }, []);
  useEffect(() => {
    if (selectedFarm) {
      fetchExpenses();
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

  const fetchTimeseries = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/bi/timeseries`, { params: { farmId: selectedFarm, metric: "cost", granularity: "day" } });
      setCostTs(res.data.data || []);
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

  const handleDeleteExpense = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/expenses/${id}`);
      toast.success("Expense deleted");
      fetchExpenses();
      fetchTimeseries();
    } catch (err) { toast.error("Failed to delete"); }
  };

  return (
    <Layout loading={loading}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-serif">Expense Tracking</h1>
            <p className="text-muted-foreground text-sm mt-1">Track and manage farm expenses</p>
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
          </div>
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
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
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
      </div>
    </Layout>
  );
}
