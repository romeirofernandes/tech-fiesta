import { useState, useEffect } from 'react';
import { BusinessLayout } from "@/components/BusinessLayout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Coins, CheckCircle2, User } from "lucide-react";
import { useLocation } from 'react-router-dom';
import axios from "axios";

export default function BusinessSales() {
    const { mongoUser, bizOwner } = useUser();
    const location = useLocation();
    const isBizOwnerMode = location.pathname.startsWith('/biz');
    const currentUser = isBizOwnerMode ? bizOwner : mongoUser;
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser) fetchSales();
    }, [currentUser]);

    const fetchSales = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/payments/my-sales?sellerId=${currentUser._id}`);
            setSales(res.data);
        } catch (err) {
            console.error("Error fetching sales:", err);
        } finally {
            setLoading(false);
        }
    };

    const totalEarned = sales.filter(s => s.status === 'released_to_seller').reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <BusinessLayout loading={loading}>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-serif">My Sales</h1>
                    <p className="text-muted-foreground text-sm mt-1">Revenue directly credited to your account</p>
                </div>

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
                            <div className="bg-purple-500/10 p-3 rounded-lg">
                                <Coins className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Sales</p>
                                <p className="text-2xl font-semibold tracking-tight">{sales.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-3">
                    {sales.map((sale) => (
                        <Card key={sale._id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {sale.itemImage ? (
                                        <img src={sale.itemImage} alt={sale.itemName} className="h-12 w-12 rounded-lg object-cover" />
                                    ) : (
                                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                            <Coins className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{sale.itemName}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <User className="h-3 w-3" /> {sale.buyerName} | {new Date(sale.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-green-600">+₹{sale.amount?.toLocaleString()}</p>
                                    <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Credited
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {sales.length === 0 && !loading && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No sales yet. List your animals on the marketplace to start selling!</p>
                        </div>
                    )}
                </div>
            </div>
        </BusinessLayout>
    );
}
