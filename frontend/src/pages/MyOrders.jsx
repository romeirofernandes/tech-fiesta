import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Package, Loader2, Lock, CheckCircle2, Calendar, IndianRupee, MapPin } from "lucide-react";
import axios from "axios";
import { useState, useEffect } from "react";

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
            <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/40 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 text-xs uppercase tracking-widest font-bold">
                                Transactions
                            </Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground font-serif">
                            My <span className="text-primary">Orders</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                            Track your purchases and manage secure release codes for escrow transactions.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 px-6 py-4 bg-green-50/50 rounded-2xl border border-green-100 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                            <p className="font-bold text-green-900 leading-tight">100% Secure</p>
                            <p className="text-xs text-green-700 font-medium">Escrow Protection Active</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-50" /></div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-muted/20 rounded-3xl border border-dashed border-border text-center space-y-4">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-primary/50" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">No Orders Yet</h3>
                            <p className="text-muted-foreground">Start exploring the marketplace to find equipment and livestock.</p>
                        </div>
                        <Button className="rounded-xl font-bold px-8 mt-4" onClick={() => window.location.href = '/marketplace'}>Browse Marketplace</Button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {orders.map(order => (
                            <Card key={order._id} className="overflow-hidden border-border/40 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl bg-card">
                                <CardContent className="p-0">
                                    {/* Horizontal Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                                        {/* Left: Order Info - 5 cols */}
                                        <div className="lg:col-span-5 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-border/30 space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                                                    <Package className="h-8 w-8 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-2xl font-bold text-foreground truncate">{order.itemId?.name || 'Unknown Item'}</h3>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 font-medium">
                                                        <span className="px-2 py-1 bg-muted/50 rounded-md">#{order.razorpayOrderId.slice(-6)}</span>
                                                        <span>•</span>
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Paid</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <IndianRupee className="h-5 w-5 text-primary" />
                                                        <p className="text-3xl font-black text-foreground">{order.amount.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                                                    <Badge variant="outline" className={`px-3 py-1.5 rounded-full capitalize border-none font-bold text-sm ${order.status === 'held_in_escrow' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                        {order.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Action Area - 7 cols */}
                                        <div className="lg:col-span-7 p-6 md:p-8 bg-muted/10">
                                            {order.status === 'held_in_escrow' && (
                                                <div className="h-full flex flex-col justify-center space-y-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-yellow-500/10 p-3 rounded-xl shrink-0">
                                                            <Lock className="h-6 w-6 text-yellow-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-xl font-bold text-foreground mb-2">Pending Delivery</h4>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                Your payment is held safely in escrow. Only share the release code with the seller <b>after</b> you receive and verify the item.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-background border-2 border-dashed border-yellow-200 rounded-2xl p-6 text-center space-y-3">
                                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Release Code</p>
                                                        <div className="flex items-center justify-center gap-4">
                                                            <span className="font-mono font-black text-5xl tracking-[0.3em] text-yellow-700">{order.releaseCode}</span>
                                                            <button onClick={() => copyCode(order.releaseCode)} className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-muted rounded-lg">
                                                                <Copy className="h-6 w-6" />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">Click icon to copy</p>
                                                    </div>
                                                </div>
                                            )}

                                            {order.status === 'released_to_seller' && (
                                                <div className="h-full flex items-center justify-center">
                                                    <div className="text-center space-y-4">
                                                        <div className="mx-auto bg-green-500/10 p-4 rounded-full w-fit">
                                                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-2xl font-bold text-foreground">Transaction Complete</h4>
                                                            <p className="text-muted-foreground mt-2">Funds released to seller & asset ownership transferred.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
