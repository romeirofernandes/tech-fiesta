import { useState, useEffect } from 'react';
import { BusinessLayout } from "@/components/BusinessLayout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useLocation } from 'react-router-dom';
import axios from "axios";

export default function BusinessOrders() {
    const { mongoUser, bizOwner } = useUser();
    const location = useLocation();
    const isBizOwnerMode = location.pathname.startsWith('/biz');
    const currentUser = isBizOwnerMode ? bizOwner : mongoUser;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser) fetchOrders();
    }, [currentUser]);

    const fetchOrders = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/payments/my-orders?buyerId=${currentUser._id}`);
            setOrders(res.data);
        } catch (err) {
            console.error("Error fetching orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const totalSpent = orders.filter(o => o.status === 'released_to_seller').reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <BusinessLayout loading={loading}>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-serif">My Orders</h1>
                    <p className="text-muted-foreground text-sm mt-1">Track your purchases</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-blue-500/10 p-3 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Spent</p>
                                <p className="text-2xl font-semibold tracking-tight">₹{totalSpent.toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-purple-500/10 p-3 rounded-lg">
                                <Package className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Orders</p>
                                <p className="text-2xl font-semibold tracking-tight">{orders.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-3">
                    {orders.map((order) => (
                        <Card key={order._id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {order.itemImage ? (
                                        <img src={order.itemImage} alt={order.itemName} className="h-12 w-12 rounded-lg object-cover" />
                                    ) : (
                                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                            <Package className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{order.itemName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Order ...{order._id.slice(-6)} | {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">₹{order.amount?.toLocaleString()}</p>
                                    <Badge variant={order.status === 'released_to_seller' ? 'default' : 'secondary'} className="text-xs">
                                        {order.status === 'released_to_seller' ? (
                                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Complete</>
                                        ) : order.status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {orders.length === 0 && !loading && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No orders yet. Visit the marketplace to make your first purchase!</p>
                        </div>
                    )}
                </div>
            </div>
        </BusinessLayout>
    );
}
