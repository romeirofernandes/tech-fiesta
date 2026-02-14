import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import axios from 'axios';

export default function AddEquipmentModal({ onSuccess }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        priceUnit: 'per day',
        location: '',
        contact: '',
        imageUrl: '' // In a real app, we'd handle file upload here
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            await axios.post(`${base}/api/marketplace`, {
                type: 'equipment',
                seller: 'Demo Farmer',
                ...formData
            });
            setOpen(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error adding equipment:", error);
            alert("Failed to add equipment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                    + List Equipment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>List Equipment for Rent</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Equipment Name</Label>
                        <Input id="name" name="name" placeholder="e.g., John Deere Tractor" required onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" placeholder="Condition, horsepower, etc." onChange={handleChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (₹)</Label>
                            <Input id="price" name="price" type="number" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priceUnit">Unit</Label>
                            <select
                                name="priceUnit"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                onChange={handleChange}
                                value={formData.priceUnit}
                            >
                                <option value="per day">Per Day</option>
                                <option value="per hour">Per Hour</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" placeholder="Village, District" required onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact">Contact Number</Label>
                        <Input id="contact" name="contact" placeholder="+91 XXXXX XXXXX" required onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                        <Input id="imageUrl" name="imageUrl" placeholder="https://..." onChange={handleChange} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        List Item
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
