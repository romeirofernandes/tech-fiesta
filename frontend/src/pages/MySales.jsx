import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Loader2, CheckCircle2, TrendingUp, Wallet } from "lucide-react";
import axios from "axios";

export default function MySales() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [redeemCode, setRedeemCode] = useState({}); // Map of transactionId -> code input
    const [redeeming, setRedeeming] = useState(null); // ID of currently redeeming

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/payments/my-sales?sellerName=Demo Farmer`);
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
            fetchSales(); // Refresh UI
        } catch (err) {
            alert("Error: " + (err.response?.data?.message || err.message));
        } finally {
            setRedeeming(null);
        }
    };

    const totalEarned = sales.filter(s => s.status === 'released_to_seller').reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <Layout>
            <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold font-serif text-foreground/90 tracking-tight">Sales & Earnings</h1>
                        <p className="text-muted-foreground">Manage your sold items and claim funds securely.</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 px-8 py-4 rounded-3xl flex items-center gap-4 shadow-sm">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Total Revenue</p>
                            <p className="text-3xl font-black text-foreground">₹{totalEarned.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-50" /></div>
                ) : sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-muted/20 rounded-3xl border border-dashed border-border text-center space-y-4">
                        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <p className="text-lg font-medium text-foreground">No active sales yet</p>
                        <p className="text-muted-foreground text-sm">List your equipment or livestock on the marketplace to start earning.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {sales.map(sale => (
                            <Card key={sale._id} className="overflow-hidden border-border/40 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl bg-card">
                                <CardHeader className="bg-muted/30 pb-4 border-b border-border/30">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-xl font-bold">{sale.itemId?.name || 'Unknown Item'}</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-1 font-medium">Sold to <span className="text-foreground">{sale.buyerName}</span></p>
                                        </div>
                                        <Badge variant="outline" className={`px-3 py-1.5 rounded-full capitalize border-none font-bold ${sale.status === 'released_to_seller' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {sale.status.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div className="space-y-1 w-full md:w-auto">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sale Amount</p>
                                            <p className="text-3xl font-black text-foreground">₹{sale.amount.toLocaleString()}</p>
                                        </div>

                                        {sale.status === 'held_in_escrow' ? (
                                            <div className="flex-1 w-full md:w-auto bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                                                <div className="flex flex-col space-y-3">
                                                    <div className="flex items-center gap-2 text-blue-800">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span className="text-sm font-bold">Payment Held in Escrow</span>
                                                    </div>
                                                    <p className="text-xs text-blue-600/80">Ask the buyer for the 4-digit code upon delivery to release funds.</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Input
                                                            placeholder="Enter 4-Digit Code"
                                                            maxLength={4}
                                                            className="font-mono text-center tracking-widest font-bold bg-white border-blue-200 h-10"
                                                            value={redeemCode[sale._id] || ''}
                                                            onChange={(e) => setRedeemCode({ ...redeemCode, [sale._id]: e.target.value })}
                                                        />
                                                        <Button
                                                            onClick={() => handleRedeem(sale._id)}
                                                            disabled={redeeming === sale._id}
                                                            className="bg-blue-600 hover:bg-blue-700 h-10 px-6 font-bold shadow-lg shadow-blue-500/20"
                                                        >
                                                            {redeeming === sale._id ? <Loader2 className="animate-spin h-4 w-4" /> : "Claim"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 text-green-600 font-bold bg-green-50/80 px-6 py-4 rounded-2xl border border-green-100 w-full md:w-auto justify-center md:justify-start">
                                                <div className="bg-green-200 p-1.5 rounded-full"><CheckCircle2 className="h-5 w-5 text-green-700" /></div>
                                                <span>Funds Released to Wallet</span>
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
