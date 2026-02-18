import { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, TrendingUp, Wallet, Coins, User } from "lucide-react";
import axios from "axios";

export default function MySales() {
    const { mongoUser } = useUser();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (mongoUser) fetchSales();
    }, [mongoUser]);

    const fetchSales = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/payments/my-sales?sellerId=${mongoUser._id}`);
            setSales(res.data);
        } catch (err) {
            console.error("Error fetching sales:", err);
        } finally {
            setLoading(false);
        }
    };

    const totalEarned = sales.filter(s => s.status === 'released_to_seller').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = sales.filter(s => s.status === 'held_in_escrow').reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <Layout loading={loading}>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">My Sales</h1>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-green-500/10 p-3 rounded-lg">
                                <Wallet className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Revenue</p>
                                <p className="text-2xl font-semibold tracking-tight">₹{totalEarned.toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-chart-2/10 p-3 rounded-lg">
                                <Coins className="h-5 w-5 text-chart-2" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Pending in Escrow</p>
                                <p className="text-2xl font-semibold tracking-tight">₹{pendingAmount.toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sales List */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                    </div>
                ) : sales.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="font-medium">No sales yet</p>
                            <p className="text-sm text-muted-foreground mt-1">List items on the marketplace to start earning.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="p-4 font-medium">Item</th>
                                            <th className="p-4 font-medium">Buyer</th>
                                            <th className="p-4 font-medium text-right">Amount</th>
                                            <th className="p-4 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.map(sale => (
                                            <tr key={sale._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-primary/10 p-2 rounded-lg">
                                                            <Coins className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{sale.itemName || sale.itemId?.name || 'Unknown Item'}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(sale.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <User className="h-3 w-3" />
                                                        <span>{sale.buyerName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-semibold">₹{sale.amount.toLocaleString()}</td>
                                                <td className="p-4">
                                                    {sale.status === 'released_to_seller' ? (
                                                        <Badge variant="outline" className="gap-1 text-green-700 bg-green-500/10 border-none">
                                                            <CheckCircle2 className="h-3 w-3" /> Released
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="gap-1 text-chart-2 bg-chart-2/10 border-none">
                                                            <Loader2 className="h-3 w-3 animate-spin" /> In Escrow
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
