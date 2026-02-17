import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Package, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MyOrders() {
    const { mongoUser } = useUser();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (mongoUser) fetchOrders();
    }, [mongoUser]);

    const fetchOrders = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/payments/my-orders?buyerName=${mongoUser.fullName}`);
            setOrders(res.data);
        } catch (err) {
            console.error("Error fetching orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success("Release code copied!");
    };

    return (
        <Layout loading={loading}>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">My Orders</h1>
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                    </div>
                ) : orders.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="font-medium">No orders yet</p>
                            <p className="text-sm text-muted-foreground mt-1">Browse the marketplace to find equipment and livestock.</p>
                            <Button variant="link" size="sm" className="mt-2" onClick={() => navigate('/marketplace')}>
                                Go to Marketplace
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => (
                            <Card key={order._id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        {/* Item info */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                                                <Package className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{order.itemId?.name || 'Unknown Item'}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    <span>#{order.razorpayOrderId.slice(-6)}</span>
                                                    <span>·</span>
                                                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Paid</p>
                                            <p className="text-lg font-semibold">₹{order.amount.toLocaleString()}</p>
                                        </div>

                                        {/* Status */}
                                        <div className="shrink-0">
                                            {order.status === 'released_to_seller' ? (
                                                <Badge variant="outline" className="gap-1 text-green-700 bg-green-500/10 border-none">
                                                    <CheckCircle2 className="h-3 w-3" /> Complete
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="gap-1 text-chart-5 bg-chart-5/10 border-none">
                                                    In Escrow
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Release code for escrow orders */}
                                    {order.status === 'held_in_escrow' && (
                                        <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <p className="text-sm text-muted-foreground">
                                                Share this code with the seller <b>after</b> you receive the item.
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <code className="font-mono font-bold text-lg tracking-widest bg-muted px-3 py-1.5 rounded-lg">
                                                    {order.releaseCode}
                                                </code>
                                                <Button variant="ghost" size="icon" onClick={() => copyCode(order.releaseCode)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
