import React, { useState, useEffect } from 'react';
import { useUser } from "@/context/UserContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";
import axios from 'axios';

export default function SellCattleModal({ onSuccess }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [animals, setAnimals] = useState([]);
    const [selectedAnimal, setSelectedAnimal] = useState(null);
    const [step, setStep] = useState(1); // 1: Select Animal, 2: Add Details
    const [formData, setFormData] = useState({
        price: '',
        location: '',
        contact: '',
        description: ''
    });

    const { mongoUser } = useUser();

    useEffect(() => {
        if (open && mongoUser) {
            fetchAnimals();
            console.log("MongoUser for Auto-fill:", mongoUser);
            // Auto-fill contact details
            setFormData(prev => ({
                ...prev,
                contact: mongoUser.phoneNumber || '',
                // Check if user has farms and use the first farm's location as default
                location: mongoUser.farms?.[0]?.location || ''
            }));
        }
    }, [open, mongoUser]);

    const fetchAnimals = async () => {
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/animals?farmerId=${mongoUser._id}`);
            setAnimals(res.data);
        } catch (err) {
            console.error("Error fetching animals:", err);
        }
    };

    const handleSelectAnimal = (animal) => {
        setSelectedAnimal(animal);
        // If animal has a farm with location, use it. Otherwise keep existing (default)
        if (animal.farmId?.location) {
            setFormData(prev => ({ ...prev, location: animal.farmId.location }));
        }
        setStep(2);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            await axios.post(`${base}/api/marketplace`, {
                type: 'cattle',
                seller: mongoUser._id, // Send ID
                name: selectedAnimal.name + ` (${selectedAnimal.breed})`, // Construct display name
                description: `${selectedAnimal.breed} - ${selectedAnimal.age} ${selectedAnimal.ageUnit} old.\n${formData.description}`,
                price: formData.price,
                priceUnit: 'fixed',
                location: formData.location,
                contact: formData.contact,
                imageUrl: selectedAnimal.imageUrl,
                linkedAnimalId: selectedAnimal._id
            });
            setOpen(false);
            setStep(1);
            setSelectedAnimal(null);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error selling cattle:", error);
            alert("Failed to list cattle. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="font-bold border-primary text-primary hover:bg-primary/10">
                    + Sell Animal
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === 1 ? "Select Animal from Farm" : "Listing Details"}
                    </DialogTitle>
                </DialogHeader>

                {step === 1 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {animals.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No animals found in your farm.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {animals.map(animal => (
                                    <div
                                        key={animal._id}
                                        onClick={() => handleSelectAnimal(animal)}
                                        className="cursor-pointer border rounded-xl p-3 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-secondary/50 overflow-hidden shrink-0">
                                            {animal.imageUrl ? (
                                                <img src={animal.imageUrl} alt={animal.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                                                    {animal.species?.substring(0, 2) || 'NA'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{animal.name}</p>
                                            <p className="text-xs text-muted-foreground">{animal.breed}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-center text-muted-foreground pt-2">
                            Select an animal to auto-fill details from your farm records.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="bg-primary/5 p-3 rounded-lg flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Check className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Selling: {selectedAnimal.name}</p>
                                <p className="text-xs text-muted-foreground">{selectedAnimal.breed} • {selectedAnimal.age} {selectedAnimal.ageUnit}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)} type="button" className="ml-auto text-xs h-auto py-1">Change</Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Selling Price (₹)</Label>
                                <Input id="price" name="price" type="number" required value={formData.price} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact">Contact Number</Label>
                                <Input id="contact" name="contact" required value={formData.contact} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" placeholder="Village, District" required value={formData.location} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Additional Details</Label>
                            <Textarea id="description" name="description" placeholder="Health status, milk yield, reason for sale..." value={formData.description} onChange={handleChange} />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            List Animal for Sale
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
