import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, RefreshCw } from "lucide-react";
import axios from "axios";

export default function TransactionMonitor() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            // Admin endpoint for all transactions
            const res = await axios.get(`${base}/api/payments/admin/all`);
            setTransactions(res.data);
        } catch (err) {
            console.error("Error fetching transactions:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleReleaseFunds = async (transactionId) => {
        if (!confirm("Are you sure you want to release funds to the seller? This action cannot be undone.")) return;

        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            await axios.post(`${base}/api/payments/admin/release`, { transactionId });
            alert("Funds released successfully!");
            fetchTransactions();
        } catch (error) {
            console.error("Error releasing funds:", error);
            alert("Failed to release funds: " + (error.response?.data?.message || error.message));
        }
    };

    const filteredTransactions = transactions.filter(t =>
        t.razorpayOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.itemId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending_payment': return 'secondary';
            case 'held_in_escrow': return 'warning';
            case 'released_to_seller': return 'success';
            case 'refunded': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Escrow Transactions</CardTitle>
                        <CardDescription>Monitor all secure payments and fund releases.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
                <div className="mt-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Order ID, Buyer, or Item..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Buyer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTransactions.map((t) => (
                                        <TableRow key={t._id}>
                                            <TableCell className="font-medium text-xs text-muted-foreground">
                                                {new Date(t.createdAt).toLocaleDateString()}
                                                <br />
                                                {new Date(t.createdAt).toLocaleTimeString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{t.razorpayOrderId}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{t.itemId?.name || 'Deleted Item'}</span>
                                                    <span className="text-xs text-muted-foreground">Seller: {t.itemId?.seller?.fullName || 'Unknown'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{t.buyerName}</TableCell>
                                            <TableCell className="font-bold">₹{t.amount?.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge className={`capitalize ${t.status === 'held_in_escrow' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                                    t.status === 'released_to_seller' ? 'bg-green-500 hover:bg-green-600' :
                                                        'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                                    }`}>
                                                    {t.status?.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {t.status === 'held_in_escrow' && (
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleReleaseFunds(t._id)}
                                                    >
                                                        Release Funds
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
