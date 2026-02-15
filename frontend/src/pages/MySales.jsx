import { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Loader2, CheckCircle2, TrendingUp, Wallet, User, IndianRupee, Calendar } from "lucide-react";
import axios from "axios";

export default function MySales() {
    const { mongoUser } = useUser();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [redeemCode, setRedeemCode] = useState({});
    const [redeeming, setRedeeming] = useState(null);

    useEffect(() => {
        if (mongoUser) {
            fetchSales();
        }
    }, [mongoUser]);

    const fetchSales = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/payments/my-sales?sellerName=${mongoUser.fullName}`);
            setSales(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching sales:", err);
            setLoading(false);
        }
    };

    const handleRedeem = async (transactionId) => {
        const code = redeemCode[transactionId];
        if (!code || code.length !== 4) return alert("Please enter a valid 4-digit code.");

        setRedeeming(transactionId);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            await axios.post(`${base}/api/payments/release`, {
                transactionId,
                releaseCode: code
            });
            alert("Success! Funds released to your account.");
            fetchSales();
        } catch (err) {
            alert("Error: " + (err.response?.data?.message || err.message));
        } finally {
            setRedeeming(null);
        }
    };

    const totalEarned = sales.filter(s => s.status === 'released_to_seller').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = sales.filter(s => s.status === 'held_in_escrow').reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
                {/* Header with Stats */}
                <div className="flex items-center justify-between border-b border-border/40 pb-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">Sales & Earnings</h1>
                        <p className="text-muted-foreground">Manage your sold items and claim funds securely.</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-green-200 bg-green-50/30">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-green-500/10 rounded-2xl flex items-center justify-center">
                                    <Wallet className="h-7 w-7 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <IndianRupee className="h-5 w-5 text-green-600" />
                                        <p className="text-3xl font-black text-foreground">{totalEarned.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                    <Coins className="h-7 w-7 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending in Escrow</p>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <IndianRupee className="h-5 w-5 text-blue-600" />
                                        <p className="text-3xl font-black text-foreground">{pendingAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-50" /></div>
                ) : sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-muted/20 rounded-3xl border border-dashed border-border text-center space-y-4">
                        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">No Active Sales Yet</h3>
                            <p className="text-muted-foreground">List your equipment or livestock on the marketplace to start earning.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {sales.map(sale => (
                            <Card key={sale._id} className="overflow-hidden border-border/40 shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl bg-card">
                                <CardContent className="p-0">
                                    {/* Horizontal Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                                        {/* Left: Sale Info - 5 cols */}
                                        <div className="lg:col-span-5 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-border/30 space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                                                    <Coins className="h-8 w-8 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-2xl font-bold text-foreground truncate">{sale.itemId?.name || 'Unknown Item'}</h3>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 font-medium">
                                                        <User className="h-3 w-3" />
                                                        <span>Sold to <b className="text-foreground">{sale.buyerName}</b></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sale Amount</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <IndianRupee className="h-5 w-5 text-primary" />
                                                        <p className="text-3xl font-black text-foreground">{sale.amount.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                                                    <Badge variant="outline" className={`px-3 py-1.5 rounded-full capitalize border-none font-bold text-sm ${sale.status === 'released_to_seller' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {sale.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Action Area - 7 cols */}
                                        <div className="lg:col-span-7 p-6 md:p-8 bg-muted/10">
                                            {sale.status === 'held_in_escrow' ? (
                                                <div className="h-full flex flex-col justify-center space-y-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-blue-500/10 p-3 rounded-xl shrink-0">
                                                            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-xl font-bold text-foreground mb-2">Payment Held in Escrow</h4>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                Ask the buyer for the 4-digit release code upon delivery to claim your funds.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-background border-2 border-dashed border-blue-200 rounded-2xl p-6 space-y-4">
                                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Enter Release Code</p>
                                                        <div className="flex gap-3">
                                                            <Input
                                                                placeholder="0000"
                                                                maxLength={4}
                                                                className="font-mono text-center text-2xl tracking-widest font-bold bg-white border-blue-200 h-14 flex-1"
                                                                value={redeemCode[sale._id] || ''}
                                                                onChange={(e) => setRedeemCode({ ...redeemCode, [sale._id]: e.target.value })}
                                                            />
                                                            <Button
                                                                onClick={() => handleRedeem(sale._id)}
                                                                disabled={redeeming === sale._id}
                                                                className="bg-blue-600 hover:bg-blue-700 h-14 px-8 font-bold shadow-lg shadow-blue-500/20"
                                                            >
                                                                {redeeming === sale._id ? <Loader2 className="animate-spin h-5 w-5" /> : "Claim Funds"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center">
                                                    <div className="text-center space-y-4">
                                                        <div className="mx-auto bg-green-500/10 p-4 rounded-full w-fit">
                                                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-2xl font-bold text-foreground">Funds Released</h4>
                                                            <p className="text-muted-foreground mt-2">Payment has been transferred to your wallet.</p>
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
