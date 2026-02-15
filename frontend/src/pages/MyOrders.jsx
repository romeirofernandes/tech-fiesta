import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Package, Loader2, Lock, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { useState,useEffect } from "react";

export default function MyOrders() {
    const { mongoUser } = useUser();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (mongoUser) {
            fetchOrders();
        }
    }, [mongoUser]);

    const fetchOrders = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/payments/my-orders?buyerName=${mongoUser.fullName}`);
            setOrders(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching orders:", err);
            setLoading(false);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        alert("Release Code copied to clipboard!");
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-extrabold font-serif text-foreground/90 tracking-tight">My Purchases</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Track your orders and manage secure release codes for your escrow transactions.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-50" /></div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-muted/20 rounded-3xl border border-dashed border-border text-center space-y-4">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-primary/50" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-serif">No Orders Yet</h3>
                            <p className="text-muted-foreground">Start exploring the marketplace to find equipment and livestock.</p>
                        </div>
                        <Button className="rounded-xl font-bold px-8 mt-4" onClick={() => window.location.href = '/marketplace'}>Browse Marketplace</Button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {orders.map(order => (
                            <Card key={order._id} className="overflow-hidden border-border/40 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl bg-card">
                                <CardHeader className="bg-muted/30 pb-4 border-b border-border/30">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-border/50 flex items-center justify-center">
                                                <Truck className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold">{order.itemId?.name || 'Unknown Item'}</CardTitle>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 font-medium">
                                                    <span>Order #{order.razorpayOrderId.slice(-6)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`px-3 py-1.5 rounded-full capitalize border-none font-bold ${order.status === 'held_in_escrow' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                            {order.status.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row justify-between gap-8 md:items-center">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Paid</p>
                                            <p className="text-3xl font-black text-foreground">₹{order.amount.toLocaleString()}</p>
                                            <p className="text-sm text-muted-foreground">Via Razorpay Secure Escrow</p>
                                        </div>

                                        {order.status === 'held_in_escrow' && (
                                            <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                                                <div className="flex items-start gap-4">
                                                    <div className="bg-yellow-100 p-2.5 rounded-full shrink-0">
                                                        <Lock className="h-6 w-6 text-yellow-700" />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-bold text-yellow-900">Pending Delivery</p>
                                                        <p className="text-sm text-yellow-700/90 leading-relaxed max-w-sm mt-1">
                                                            Money is held safely. Only share the release code with the seller <b>after</b> you receive and verify the item.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center gap-2 bg-white px-6 py-3 rounded-xl border border-yellow-100 shadow-sm w-full md:w-auto">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Release Code</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-black text-3xl tracking-[0.2em] text-yellow-900">{order.releaseCode}</span>
                                                        <button onClick={() => copyCode(order.releaseCode)} className="text-muted-foreground hover:text-primary transition-colors p-1">
                                                            <Copy className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {order.status === 'released_to_seller' && (
                                            <div className="flex-1 bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-center gap-3 text-green-700 shadow-sm">
                                                <div className="bg-green-100 p-2 rounded-full"><CheckCircle2 className="h-6 w-6" /></div>
                                                <div className="text-center md:text-left">
                                                    <span className="block text-lg font-bold">Transaction Complete</span>
                                                    <span className="text-sm opacity-90">Funds released to seller & asset ownership transferred.</span>
                                                </div>
                                            </div>
                                        )}
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
