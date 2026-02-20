import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tractor, MapPin, CheckCircle2, Store, ArrowRight, Lock, Phone, Search, Thermometer, Droplets, HeartPulse, Syringe, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SpeciesIcon, speciesOptions } from "@/lib/animalIcons";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddEquipmentModal from "@/components/AddEquipmentModal";
import SellCattleModal from "@/components/SellCattleModal";
import axios from "axios";
import { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";

export default function Marketplace() {
    const { mongoUser } = useUser();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchName, setSearchName] = useState("");
    const [debouncedSearchName, setDebouncedSearchName] = useState("");
    const [selectedSpecies, setSelectedSpecies] = useState("all");
    const [successData, setSuccessData] = useState(null);

    // Asset Transfer State
    const [selectedItemForPurchase, setSelectedItemForPurchase] = useState(null);
    const [userFarms, setUserFarms] = useState([]);
    const [selectedFarmId, setSelectedFarmId] = useState("");
    const [showFarmSelectDialog, setShowFarmSelectDialog] = useState(false);

    useEffect(() => {
        fetchItems();
        if (mongoUser) {
            fetchUserFarms();
        }
    }, [activeTab, mongoUser]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearchName(searchName.trim());
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchName]);

    useEffect(() => {
        if (activeTab === 'equipment' && selectedSpecies !== 'all') {
            setSelectedSpecies('all');
        }
    }, [activeTab, selectedSpecies]);

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
            // Fetch only current user's farms
            const res = await axios.get(`${base}/api/farms?farmerId=${mongoUser._id}`);
            if (Array.isArray(res.data)) {
                setUserFarms(res.data);
            } else {
                console.error("Unexpected farms response:", res.data);
                setUserFarms([]);
            }
        } catch (err) {
            console.error("Error fetching farms:", err);
            setUserFarms([]);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setDebouncedSearchName(searchName.trim());
    };

    // Rental Duration State
    const [showRentDialog, setShowRentDialog] = useState(false);
    const [rentDuration, setRentDuration] = useState(1);
    const [selectedItemForRent, setSelectedItemForRent] = useState(null);

    const initiatePurchase = (item) => {
        if (item.type === 'cattle') {
            setSelectedItemForPurchase(item);
            setShowFarmSelectDialog(true);
        } else if (item.type === 'equipment' && item.priceUnit !== 'fixed') {
            setSelectedItemForRent(item);
            setRentDuration(1); // Default to 1 day/hour
            setShowRentDialog(true);
        } else {
            handleBuyNow(item);
        }
    };

    const confirmRent = () => {
        if (rentDuration < 1) return alert("Please enter a valid duration");
        setShowRentDialog(false);
        // Calculate total for frontend display confirmation if needed, but backend does the real math
        handleBuyNow(selectedItemForRent, null, rentDuration);
    };

    const confirmCattlePurchase = () => {
        if (!selectedFarmId) return alert("Please select a farm to add the cattle to.");
        setShowFarmSelectDialog(false);
        handleBuyNow(selectedItemForPurchase, selectedFarmId);
    };

    // Calculate dynamic rental price for preview
    const getRentalTotal = () => {
        if (!selectedItemForRent) return 0;
        return selectedItemForRent.price * rentDuration;
    };

    const handleBuyNow = async (item, destinationFarmId = null, rentalDuration = null) => {
        const base = import.meta.env.VITE_API_BASE_URL;

        // Calculate amount for display/prefill
        let amount = item.price;
        if (rentalDuration) {
            amount = item.price * rentalDuration;
        }

        try {
            const payload = {
                itemId: item._id,
                amount: amount, // Send estimated amount, but backend recalculates for safety
                buyerName: mongoUser?.fullName || "Guest Farmer",
                destinationFarmId: destinationFarmId,
                rentalDuration: rentalDuration
            };

            const orderRes = await axios.post(`${base}/api/payments/create-order`, payload);

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
                    name: mongoUser?.fullName || "Farmer",
                    email: mongoUser?.email || "farmer@example.com",
                    contact: mongoUser?.phoneNumber || "9999999999"
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

    const [selectedItemForView, setSelectedItemForView] = useState(null);

    // Vaccination & Sensor data for detail dialog
    const [vaccinations, setVaccinations] = useState([]);
    const [vaccPage, setVaccPage] = useState(1);
    const [sensorAvg, setSensorAvg] = useState(null);
    const [loadingExtras, setLoadingExtras] = useState(false);
    const VACC_PER_PAGE = 10;

    const openItemDetails = (item) => {
        setSelectedItemForView(item);
        setVaccinations([]);
        setSensorAvg(null);
        setVaccPage(1);
    };

    // Fetch vaccination events + sensor averages when detail dialog opens for cattle
    useEffect(() => {
        if (!selectedItemForView || selectedItemForView.type !== 'cattle') return;
        const animalId = selectedItemForView.linkedAnimalId?._id;
        if (!animalId) return;

        const base = import.meta.env.VITE_API_BASE_URL;
        setLoadingExtras(true);

        Promise.allSettled([
            axios.get(`${base}/api/vaccination-events?animalId=${animalId}`),
            axios.get(`${base}/api/iot/sensors/by_animal?animal_id=${animalId}`),
        ]).then(([vaccRes, sensorRes]) => {
            if (vaccRes.status === 'fulfilled' && Array.isArray(vaccRes.value.data)) {
                setVaccinations(vaccRes.value.data);
            }
            if (sensorRes.status === 'fulfilled') {
                const readings = Array.isArray(sensorRes.value.data) ? sensorRes.value.data : sensorRes.value.data?.readings || [];
                if (readings.length > 0) {
                    const sum = readings.reduce(
                        (acc, r) => ({
                            temp: acc.temp + (r.temperature || 0),
                            hum: acc.hum + (r.humidity || 0),
                            hr: acc.hr + (r.heartRate || 0),
                            ct: acc.ct + 1,
                        }),
                        { temp: 0, hum: 0, hr: 0, ct: 0 }
                    );
                    setSensorAvg({
                        temperature: (sum.temp / sum.ct).toFixed(1),
                        humidity: (sum.hum / sum.ct).toFixed(1),
                        heartRate: Math.round(sum.hr / sum.ct),
                        count: sum.ct,
                    });
                }
            }
        }).finally(() => setLoadingExtras(false));
    }, [selectedItemForView]);

    const isOwner = (item) => {
        return mongoUser && item.seller && (item.seller._id === mongoUser._id || item.seller === mongoUser._id);
    };

    // ... visibleItems logic remains same ...
    const visibleItems = items.filter((item) => {
        const query = debouncedSearchName.toLowerCase();
        if (query) {
            const name = String(item?.name || '').toLowerCase();
            if (!name.includes(query)) return false;
        }

        if (selectedSpecies !== 'all' && activeTab !== 'equipment') {
            if (item?.type !== 'cattle') return false;
            const species = item?.linkedAnimalId?.species;
            if (!species) return false;
            if (species !== selectedSpecies) return false;
        }

        return true;
    });

    return (
        <Layout loading={loading}>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
                {/* Header, Filters, Listing Grid sections remain same */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Marketplace</h1>
                    </div>
                    <div className="flex gap-2">
                        <AddEquipmentModal onSuccess={fetchItems} />
                        <SellCattleModal onSuccess={fetchItems} />
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex h-10 items-center bg-muted/50 rounded-lg border border-input p-1 gap-1 shrink-0">
                        {['all', 'equipment'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`h-8 px-4 rounded-md text-sm font-medium capitalize transition-colors ${activeTab === tab
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSearch} className="flex-1 flex flex-col sm:flex-row gap-2 sm:items-center">
                        {activeTab !== 'equipment' && (
                            <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                                <SelectTrigger data-size="lg" className="h-10 rounded-lg w-full sm:w-44">
                                    <SelectValue placeholder="All species" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All species</SelectItem>
                                    {speciesOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name..."
                                className="h-10 rounded-lg pl-9"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="h-10 rounded-lg">Search</Button>
                    </form>
                </div>

                {/* Listing Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-80 bg-muted/20 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : visibleItems.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Store className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="font-medium">No items found</p>
                            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleItems.map(item => (
                            <Card key={item._id} className="group overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                <div className="aspect-video relative overflow-hidden cursor-pointer" onClick={() => openItemDetails(item)}>
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                                            {item.type === 'equipment' ? <Tractor className="h-12 w-12 text-muted-foreground/30" /> : <SpeciesIcon species={item.linkedAnimalId?.species || 'cow'} className="h-12 w-12" />}
                                        </div>
                                    )}
                                    <Badge className={`absolute top-3 left-3 border-none text-xs ${item.type === 'cattle' ? 'bg-orange-500/90 text-white' : 'bg-blue-500/90 text-white'}`}>
                                        {item.type === 'cattle' ? 'Livestock' : 'Equipment'}
                                    </Badge>
                                </div>

                                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                                    <div className="flex-1 cursor-pointer" onClick={() => openItemDetails(item)}>
                                        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        <span>{item.location}</span>
                                        {item.seller?.isVerified && (
                                            <>
                                                <span>·</span>
                                                <span className="text-green-600 flex items-center gap-0.5">
                                                    <CheckCircle2 className="h-3 w-3" /> {item.seller.fullName}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-border">
                                        <div>
                                            <span className="text-lg font-semibold">₹{item.price.toLocaleString()}</span>
                                            {item.priceUnit !== 'fixed' && (
                                                <span className="text-xs text-muted-foreground ml-1">/ {item.priceUnit.replace('per ', '')}</span>
                                            )}
                                        </div>
                                        {item.status === 'sold' ? (
                                            <Badge variant="secondary">Sold</Badge>
                                        ) : isOwner(item) ? (
                                            <Badge variant="outline">Your Listing</Badge>
                                        ) : (
                                            <Button size="sm" onClick={() => initiatePurchase(item)}>
                                                {item.type === 'cattle' ? 'Buy' : 'Rent'}
                                                <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Item Details Dialog */}
                <Dialog open={!!selectedItemForView} onOpenChange={(open) => !open && setSelectedItemForView(null)}>
                    <DialogContent className="sm:max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
                        {selectedItemForView && (
                            <div className="flex flex-col">
                                {/* Image */}
                                <div className="h-48 w-full relative">
                                    {selectedItemForView.imageUrl ? (
                                        <img src={selectedItemForView.imageUrl} alt={selectedItemForView.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                                            {selectedItemForView.type === 'equipment' ? <Tractor className="h-16 w-16 text-muted-foreground/30" /> : <SpeciesIcon species={selectedItemForView.linkedAnimalId?.species || 'cow'} className="h-16 w-16" />}
                                        </div>
                                    )}
                                    <Badge className={`absolute top-3 left-3 border-none text-xs ${selectedItemForView.type === 'cattle' ? 'bg-orange-500/90 text-white' : 'bg-blue-500/90 text-white'}`}>
                                        {selectedItemForView.type === 'cattle' ? 'Livestock' : 'Equipment'}
                                    </Badge>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Title + Price */}
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold">{selectedItemForView.name}</h2>
                                            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                                                <MapPin className="h-3.5 w-3.5" /> {selectedItemForView.location}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xl font-bold text-primary">₹{selectedItemForView.price.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">{selectedItemForView.priceUnit !== 'fixed' ? selectedItemForView.priceUnit : 'Fixed Price'}</p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Description</p>
                                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{selectedItemForView.description}</p>
                                    </div>

                                    {/* Seller */}
                                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                        <div className="h-9 w-9 rounded-full overflow-hidden bg-primary/10 shrink-0">
                                            {selectedItemForView.seller?.imageUrl ? (
                                                <img src={selectedItemForView.seller.imageUrl} alt="Seller" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-xs font-bold text-primary">
                                                    {selectedItemForView.seller?.fullName?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{selectedItemForView.seller?.fullName}</p>
                                            {selectedItemForView.seller?.isVerified && (
                                                <p className="text-xs text-green-600 flex items-center gap-0.5">
                                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                                </p>
                                            )}
                                        </div>
                                        {/* Phone Logic Reuse */}
                                        {(() => {
                                            const phone = selectedItemForView.seller?.phoneNumber || selectedItemForView.contact;
                                            if (!phone) return null;
                                            const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
                                            // ...
                                            return (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={`tel:${phone}`}>
                                                        <Phone className="h-4 w-4 mr-1.5" /> Call
                                                    </a>
                                                </Button>
                                            )
                                        })()}
                                    </div>

                                    {/* Sensor Averages */}
                                    {selectedItemForView.type === 'cattle' && sensorAvg && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Health Vitals (avg)</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                                    <Thermometer className="h-5 w-5 text-red-500 shrink-0" />
                                                    <div>
                                                        <p className="text-lg font-bold leading-tight">{sensorAvg.temperature}°C</p>
                                                        <p className="text-[10px] text-muted-foreground">Temperature</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                                    <Droplets className="h-5 w-5 text-blue-500 shrink-0" />
                                                    <div>
                                                        <p className="text-lg font-bold leading-tight">{sensorAvg.humidity}%</p>
                                                        <p className="text-[10px] text-muted-foreground">Humidity</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-3 bg-pink-500/5 border border-pink-500/10 rounded-lg">
                                                    <HeartPulse className="h-5 w-5 text-pink-500 shrink-0" />
                                                    <div>
                                                        <p className="text-lg font-bold leading-tight">{sensorAvg.heartRate}</p>
                                                        <p className="text-[10px] text-muted-foreground">Heart Rate</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Vaccination Records */}
                                    {selectedItemForView.type === 'cattle' && vaccinations.length > 0 && (() => {
                                        const totalPages = Math.ceil(vaccinations.length / VACC_PER_PAGE);
                                        const paged = vaccinations.slice((vaccPage - 1) * VACC_PER_PAGE, vaccPage * VACC_PER_PAGE);
                                        return (
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                                                    Vaccination Records ({vaccinations.length})
                                                </p>
                                                <div className="border rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-muted/50 text-left">
                                                                <th className="px-3 py-2 font-medium">Vaccine</th>
                                                                <th className="px-3 py-2 font-medium">Type</th>
                                                                <th className="px-3 py-2 font-medium">Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {paged.map((v, i) => (
                                                                <tr key={v._id || i} className="border-t border-border">
                                                                    <td className="px-3 py-2 flex items-center gap-1.5">
                                                                        <Syringe className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                                                        {v.vaccineName}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <Badge variant="outline" className="text-[10px] capitalize">
                                                                            {v.eventType || 'administered'}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-muted-foreground">
                                                                        {v.date ? new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {totalPages > 1 && (
                                                        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
                                                            <span className="text-xs text-muted-foreground">
                                                                Page {vaccPage} of {totalPages}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    disabled={vaccPage <= 1}
                                                                    onClick={() => setVaccPage((p) => p - 1)}
                                                                >
                                                                    <ChevronLeft className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    disabled={vaccPage >= totalPages}
                                                                    onClick={() => setVaccPage((p) => p + 1)}
                                                                >
                                                                    <ChevronRight className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Loading state for extras */}
                                    {selectedItemForView.type === 'cattle' && loadingExtras && (
                                        <div className="text-center py-3 text-sm text-muted-foreground">Loading health data…</div>
                                    )}

                                    {/* Action */}
                                    {selectedItemForView.status === 'sold' ? (
                                        <Button disabled className="w-full">Sold Out</Button>
                                    ) : isOwner(selectedItemForView) ? (
                                        <Button disabled variant="secondary" className="w-full">Your Listing</Button>
                                    ) : (
                                        <Button className="w-full" onClick={() => {
                                            setSelectedItemForView(null);
                                            initiatePurchase(selectedItemForView);
                                        }}>
                                            {selectedItemForView.type === 'cattle' ? 'Proceed to Buy' : 'Rent Equipment'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Farm Selection Dialog */}
                <Dialog open={showFarmSelectDialog} onOpenChange={setShowFarmSelectDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Select Destination Farm</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                Where should <b>{selectedItemForPurchase?.name}</b> be delivered?
                            </p>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            {/* ... Farm Select Logic ... */}
                            <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
                                <SelectTrigger><SelectValue placeholder="Select your farm..." /></SelectTrigger>
                                <SelectContent>
                                    {userFarms.map(f => (<SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setShowFarmSelectDialog(false)}>Cancel</Button>
                            <Button onClick={confirmCattlePurchase} disabled={!selectedFarmId}>Proceed to Pay</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Rent Duration Dialog - NEW */}
                <Dialog open={showRentDialog} onOpenChange={setShowRentDialog}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Rent Equipment</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                How long do you want to rent <b>{selectedItemForRent?.name}</b> for?
                            </p>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Duration ({selectedItemForRent?.priceUnit?.replace('per ', '')}s)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={rentDuration}
                                    onChange={(e) => setRentDuration(Number(e.target.value))}
                                    className="text-lg font-bold"
                                />
                            </div>

                            <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Total Payable</span>
                                <span className="text-xl font-bold text-primary">₹{getRentalTotal().toLocaleString()}</span>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setShowRentDialog(false)}>Cancel</Button>
                            <Button onClick={confirmRent}>Proceed to Pay</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={!!successData} onOpenChange={(open) => !open && setSuccessData(null)}>
                    <DialogContent className="sm:max-w-sm text-center">
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="bg-green-500/10 p-3 rounded-full">
                                <Lock className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Payment Secured</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Funds are held in escrow. The admin will release them once you confirm receipt.
                                </p>
                            </div>
                            <Badge variant="outline" className="text-chart-5 bg-chart-5/10 border-none">Pending Admin Approval</Badge>
                            <Button className="w-full mt-2" onClick={() => setSuccessData(null)}>Got It</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
