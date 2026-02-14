import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Tractor, Calendar, MapPin, Zap, Filter, Star, CheckCircle2,Store,ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddEquipmentModal from "@/components/AddEquipmentModal";
import SellCattleModal from "@/components/SellCattleModal";
import axios from "axios";

export default function Marketplace() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchLocation, setSearchLocation] = useState("");
    const [successData, setSuccessData] = useState(null);

    // Asset Transfer State
    const [selectedItemForPurchase, setSelectedItemForPurchase] = useState(null);
    const [userFarms, setUserFarms] = useState([]);
    const [selectedFarmId, setSelectedFarmId] = useState("");
    const [showFarmSelectDialog, setShowFarmSelectDialog] = useState(false);

    useEffect(() => {
        fetchItems();
        fetchUserFarms();
    }, [activeTab]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            let url = `${base}/api/marketplace`;
            if (activeTab !== 'all') {
                url += `?type=${activeTab}`;
            }
            const res = await axios.get(url);
            setItems(res.data);
        } catch (err) {
            console.error("Error fetching marketplace items:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserFarms = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            // Assuming endpoint exists or using specific query. 
            // In a real app with auth, GET /api/farms would return user's farms.
            // For now, let's assume we can fetch all farms and filter or use a specific endpoint if avail.
            // If not available, we might mock or need to create it. 
            // Let's assume GET /api/farms returns all farms for the demo user if no auth.
            const res = await axios.get(`${base}/api/farms`);
            setUserFarms(res.data);
        } catch (err) {
            console.error("Error fetching farms:", err);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/marketplace?location=${searchLocation}&type=${activeTab === 'all' ? '' : activeTab}`);
            setItems(res.data);
        } catch (err) {
            console.error("Error searching:", err);
        } finally {
            setLoading(false);
        }
    };

    const initiatePurchase = (item) => {
        if (item.type === 'cattle') {
            setSelectedItemForPurchase(item);
            setShowFarmSelectDialog(true);
        } else {
            handleBuyNow(item);
        }
    };

    const confirmCattlePurchase = () => {
        if (!selectedFarmId) return alert("Please select a farm to add the cattle to.");
        setShowFarmSelectDialog(false);
        handleBuyNow(selectedItemForPurchase, selectedFarmId);
    };

    const handleBuyNow = async (item, destinationFarmId = null) => {
        const base = import.meta.env.VITE_API_BASE_URL;

        try {
            const orderRes = await axios.post(`${base}/api/payments/create-order`, {
                itemId: item._id,
                amount: item.price,
                buyerName: "Demo Farmer",
                destinationFarmId: destinationFarmId
            });

            const options = {
                key: "rzp_test_RMleifw23PqSwe",
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: "Pashu Pehchan Escrow",
                description: `Escrow for ${item.name}`,
                image: "https://via.placeholder.com/150",
                order_id: orderRes.data.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await axios.post(`${base}/api/payments/verify`, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });

                        setSuccessData({
                            orderId: response.razorpay_order_id,
                            releaseCode: verifyRes.data.releaseCode
                        });

                        fetchItems();

                    } catch (verifyError) {
                        alert("Payment Verification Failed: " + verifyError.message);
                    }
                },
                prefill: {
                    name: "Demo Farmer",
                    email: "farmer@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#16a34a"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (error) {
            console.error("Error initiating payment:", error);
            alert("Failed to start payment. Please try again.");
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 font-sans">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/40 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 text-xs uppercase tracking-widest font-bold">
                                Marketplace
                            </Badge>
                            <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" /> Verified Sellers
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-serif">
                            Farm <span className="text-primary">Market</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                            Upgrade your farm with premium equipment rentals or expand your herd with verified livestock.
                            Secure escrow payments ensure your peace of mind.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <AddEquipmentModal onSuccess={fetchItems} />
                        <SellCattleModal onSuccess={fetchItems} />
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="sticky top-20 z-30 bg-background/80 backdrop-blur-xl p-2 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-3">
                    <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
                        {['all', 'equipment', 'cattle'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${activeTab === tab
                                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                        <div className="relative flex-1 group">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search by Village, District, or Item..."
                                className="pl-10 h-full bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background transition-all"
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="h-full rounded-xl px-8 font-bold">
                            Search
                        </Button>
                    </form>
                </div>

                {/* Listing Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-[400px] bg-muted/20 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-muted/10 rounded-3xl border border-dashed border-muted">
                        <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center">
                            <Store className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground">No items found</p>
                            <p className="text-muted-foreground">Try adjusting your filters or search location.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {items.map(item => (
                            <Card key={item._id} className="group overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-card rounded-3xl ring-1 ring-border/50">
                                <div className="aspect-[4/3] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />

                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full bg-secondary/30 flex items-center justify-center">
                                            {item.type === 'equipment' ? <Tractor className="h-20 w-20 text-muted-foreground/30" /> : <div className="text-6xl opacity-30">🐮</div>}
                                        </div>
                                    )}

                                    <Badge className={`absolute top-4 left-4 z-20 backdrop-blur-md border-none px-3 py-1.5 ${item.type === 'cattle' ? 'bg-orange-500/90' : 'bg-blue-500/90'} text-white shadow-sm`}>
                                        {item.type === 'cattle' ? 'Livestock For Sale' : 'Equipment Rental'}
                                    </Badge>

                                    <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                                        <div className="flex items-center gap-1.5 text-white/90 text-xs font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                                            <MapPin className="h-3.5 w-3.5" /> {item.location}
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-2xl leading-tight group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-10">{item.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Price</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-foreground">₹{item.price.toLocaleString()}</span>
                                                <span className="text-xs text-muted-foreground font-medium capitalize">
                                                    {item.priceUnit !== 'fixed' && ` / ${item.priceUnit.replace('per ', '')}`}
                                                </span>
                                            </div>
                                        </div>

                                        {item.status === 'sold' ? (
                                            <Button disabled size="lg" className="rounded-2xl px-6 bg-muted text-muted-foreground font-bold">
                                                Sold Out
                                            </Button>
                                        ) : (
                                            <Button
                                                size="lg"
                                                className="rounded-2xl px-6 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95"
                                                onClick={() => initiatePurchase(item)}
                                            >
                                                {item.type === 'cattle' ? 'Buy Now' : 'Rent Now'}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Farm Selection Dialog */}
                <Dialog open={showFarmSelectDialog} onOpenChange={setShowFarmSelectDialog}>
                    <DialogContent className="sm:max-w-md bg-background border-none shadow-2xl rounded-3xl p-6">
                        <DialogHeader className="space-y-4">
                            <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center text-primary">
                                <Store className="h-8 w-8" />
                            </div>
                            <DialogTitle className="text-center text-2xl font-serif">Select Destination Farm</DialogTitle>
                            <p className="text-center text-muted-foreground">
                                Where should we deliver <b>{selectedItemForPurchase?.name}</b>?
                            </p>
                        </DialogHeader>

                        <div className="py-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Choose Farm</Label>
                                <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-transparent hover:bg-muted/50">
                                        <SelectValue placeholder="Select your farm..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                                        {userFarms.map(farm => (
                                            <SelectItem key={farm._id} value={farm._id} className="rounded-lg my-1">
                                                {farm.name} <span className="text-muted-foreground text-xs ml-2">({farm.location.city})</span>
                                            </SelectItem>
                                        ))}
                                        {userFarms.length === 0 && (
                                            <div className="p-4 text-center text-sm text-muted-foreground">No farms found. Please create one first.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="rounded-xl h-11" onClick={() => setShowFarmSelectDialog(false)}>
                                Cancel
                            </Button>
                            <Button className="rounded-xl h-11 font-bold" onClick={confirmCattlePurchase} disabled={!selectedFarmId}>
                                Proceed to Pay
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={!!successData} onOpenChange={(open) => !open && setSuccessData(null)}>
                    <DialogContent className="sm:max-w-md bg-white border-green-100 shadow-2xl rounded-3xl p-0 overflow-hidden">
                        <div className="bg-green-600 p-8 text-center text-white">
                            <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                                <Lock className="h-10 w-10 text-white" />
                            </div>
                            <DialogTitle className="text-2xl font-serif text-white mb-2">Payment Secured!</DialogTitle>
                            <p className="text-green-100 text-sm">Your funds are safely held in escrow.</p>
                        </div>

                        <div className="p-8 space-y-6 text-center">
                            <p className="text-muted-foreground">
                                Please verify the item upon delivery/rental start. Once satisfied, share this code with the seller to release the funds.
                            </p>

                            <div className="bg-green-50 border-2 border-dashed border-green-200 p-6 rounded-2xl relative group cursor-pointer hover:bg-green-100 transition-colors"
                                onClick={() => { navigator.clipboard.writeText(successData?.releaseCode); alert("Code Copied!") }}>
                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-[0.2em] mb-2">Your Secure Release Code</p>
                                <p className="text-5xl font-black text-green-700 tracking-[0.2em] font-mono">{successData?.releaseCode}</p>
                                <p className="text-xs text-green-600/60 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to Copy</p>
                            </div>

                            <Button className="w-full rounded-xl h-12 text-base font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20" onClick={() => setSuccessData(null)}>
                                I Understand
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
