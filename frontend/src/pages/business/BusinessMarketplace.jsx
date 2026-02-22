import { BusinessLayout } from "@/components/BusinessLayout";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tractor, MapPin, CheckCircle2, Store, ArrowRight, Phone, Search, Thermometer, Droplets, HeartPulse, Syringe, ChevronLeft, ChevronRight, TrendingUp, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SpeciesIcon, speciesOptions } from "@/lib/animalIcons";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddEquipmentModal from "@/components/AddEquipmentModal";
import SellCattleModal from "@/components/SellCattleModal";
import axios from "axios";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";

export default function BusinessMarketplace() {
    const { mongoUser, businessProfile, bizOwner } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isBizOwnerMode = location.pathname.startsWith('/biz');
    const currentUser = isBizOwnerMode ? bizOwner : mongoUser;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchName, setSearchName] = useState("");
    const [debouncedSearchName, setDebouncedSearchName] = useState("");
    const [selectedSpecies, setSelectedSpecies] = useState("all");
    const [successData, setSuccessData] = useState(null);

    const [selectedItemForPurchase, setSelectedItemForPurchase] = useState(null);
    const [userFarms, setUserFarms] = useState([]);
    const [selectedFarmId, setSelectedFarmId] = useState("");
    const [showFarmSelectDialog, setShowFarmSelectDialog] = useState(false);

    useEffect(() => {
        fetchItems();
        if (currentUser) fetchUserFarms();
    }, [activeTab, currentUser]);

    useEffect(() => {
        const timeoutId = setTimeout(() => setDebouncedSearchName(searchName.trim()), 300);
        return () => clearTimeout(timeoutId);
    }, [searchName]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            let url = `${base}/api/marketplace`;
            if (activeTab !== 'all') url += `?type=${activeTab}`;
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
            // Biz owners don't have farms — skip
            if (isBizOwnerMode) { setUserFarms([]); return; }
            const res = await axios.get(`${base}/api/farms?farmerId=${currentUser._id}`);
            setUserFarms(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setUserFarms([]);
        }
    };

    const [showRentDialog, setShowRentDialog] = useState(false);
    const [rentDuration, setRentDuration] = useState(1);
    const [selectedItemForRent, setSelectedItemForRent] = useState(null);

    const initiatePurchase = (item) => {
        if (item.type === 'cattle') {
            if (isBizOwnerMode) {
                // Biz owners buy cattle without farm selection
                handleBuyNow(item);
            } else {
                setSelectedItemForPurchase(item);
                setShowFarmSelectDialog(true);
            }
        } else if (item.type === 'equipment' && item.priceUnit !== 'fixed') {
            setSelectedItemForRent(item);
            setRentDuration(1);
            setShowRentDialog(true);
        } else {
            handleBuyNow(item);
        }
    };

    const confirmRent = () => {
        if (rentDuration < 1) return alert("Please enter a valid duration");
        setShowRentDialog(false);
        handleBuyNow(selectedItemForRent, null, rentDuration);
    };

    const confirmCattlePurchase = () => {
        if (!selectedFarmId) return alert("Please select a farm to add the cattle to.");
        setShowFarmSelectDialog(false);
        handleBuyNow(selectedItemForPurchase, selectedFarmId);
    };

    const handleBuyNow = async (item, destinationFarmId = null, rentalDuration = null) => {
        const base = import.meta.env.VITE_API_BASE_URL;
        let amount = item.price;
        if (rentalDuration) amount = item.price * rentalDuration;

        try {
            const payload = {
                itemId: item._id,
                amount,
                buyerId: currentUser?._id,
                buyerName: currentUser?.fullName || "Business Buyer",
                destinationFarmId,
                rentalDuration
            };

            const orderRes = await axios.post(`${base}/api/payments/create-order`, payload);

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY || "rzp_test_RMleifw23PqSwe",
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: "Pashu Pehchan",
                description: `Purchase: ${item.name}`,
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
                            status: 'completed'
                        });
                        fetchItems();
                    } catch (verifyError) {
                        alert("Payment Verification Failed: " + verifyError.message);
                    }
                },
                prefill: {
                    name: (isBizOwnerMode ? bizOwner?.tradeName : businessProfile?.tradeName) || currentUser?.fullName || "Business",
                    email: currentUser?.email || "",
                    contact: currentUser?.phoneNumber || ""
                },
                theme: { color: "#16a34a" }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();
        } catch (error) {
            console.error("Error initiating payment:", error);
            alert("Failed to start payment. Please try again.");
        }
    };

    const [selectedItemForView, setSelectedItemForView] = useState(null);

    const filteredItems = items.filter(item => {
        if (item.seller?._id === currentUser?._id || item.seller === currentUser?._id) return false;
        if (item.status !== 'available') return false;
        if (debouncedSearchName && !item.name?.toLowerCase().includes(debouncedSearchName.toLowerCase())) return false;
        if (selectedSpecies !== 'all' && item.type === 'cattle' && item.linkedAnimalId?.species !== selectedSpecies) return false;
        return true;
    });

    return (
        <BusinessLayout loading={loading}>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight font-serif">Marketplace</h1>
                        <p className="text-muted-foreground text-sm mt-1">Browse and purchase animals & equipment</p>
                    </div>
                    <div className="flex gap-2">
                        <SellCattleModal onSuccess={fetchItems} />
                        <AddEquipmentModal onSuccess={fetchItems} />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex gap-2">
                        {["all", "equipment"].map(tab => (
                            <Button
                                key={tab}
                                size="sm"
                                variant={activeTab === tab ? "default" : "outline"}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab === "all" ? "All Animals" : "Equipment"}
                            </Button>
                        ))}
                    </div>
                    <form onSubmit={e => { e.preventDefault(); setDebouncedSearchName(searchName.trim()); }} className="flex gap-2">
                        <Input
                            placeholder="Search..."
                            value={searchName}
                            onChange={e => setSearchName(e.target.value)}
                            className="w-48"
                        />
                    </form>
                    {activeTab !== 'equipment' && (
                        <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Species" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Species</SelectItem>
                                {speciesOptions?.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => (
                        <Card key={item._id} className="overflow-hidden hover:shadow-md transition-shadow">
                            {item.imageUrl && (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-48 object-cover" />
                            )}
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold">{item.name}</h3>
                                        <p className="text-xs text-muted-foreground">{item.type === 'cattle' ? 'Animal' : 'Equipment'}</p>
                                    </div>
                                    <Badge variant="outline">{item.status}</Badge>
                                </div>
                                {item.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                )}
                                {item.location && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        {item.location}
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <p className="text-lg font-bold text-primary">
                                        ₹{item.price?.toLocaleString()}
                                        {item.priceUnit !== 'fixed' && <span className="text-xs font-normal text-muted-foreground">/{item.priceUnit?.replace('per ', '')}</span>}
                                    </p>
                                    <Button size="sm" onClick={() => initiatePurchase(item)}>
                                        Buy Now
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredItems.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No items found</p>
                    </div>
                )}

                {/* Farm Selection Dialog */}
                <Dialog open={showFarmSelectDialog} onOpenChange={setShowFarmSelectDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Select Destination Farm</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                            <Label>Which farm should the animal be added to?</Label>
                            <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a farm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {userFarms.map(f => (
                                        <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowFarmSelectDialog(false)}>Cancel</Button>
                            <Button onClick={confirmCattlePurchase}>Confirm Purchase</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Rental Duration Dialog */}
                <Dialog open={showRentDialog} onOpenChange={setShowRentDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rental Duration</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                            <Label>How long do you want to rent?</Label>
                            <Input
                                type="number"
                                min={1}
                                value={rentDuration}
                                onChange={e => setRentDuration(Number(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">
                                Total: ₹{(selectedItemForRent?.price || 0) * rentDuration}
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowRentDialog(false)}>Cancel</Button>
                            <Button onClick={confirmRent}>Confirm Rental</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={!!successData} onOpenChange={() => setSuccessData(null)}>
                    <DialogContent>
                        <div className="text-center space-y-4 py-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                            <h2 className="text-xl font-bold">Payment Successful!</h2>
                            <p className="text-muted-foreground">
                                The amount has been transferred directly to the seller.
                            </p>
                            {successData?.orderId && (
                                <p className="text-xs text-muted-foreground font-mono">
                                    Order: ...{successData.orderId.slice(-8)}
                                </p>
                            )}
                            <Button onClick={() => { setSuccessData(null); navigate(isBizOwnerMode ? '/biz/orders' : '/business/orders'); }}>
                                View My Orders
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </BusinessLayout>
    );
}
