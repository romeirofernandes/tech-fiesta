import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Loader2, CheckCircle2, Wallet, Calendar, MapPin, Info } from "lucide-react";
import axios from "axios";

export default function SchemeDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [scheme, setScheme] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSchemeDetails();
    }, [slug]);

    const fetchSchemeDetails = async () => {
        setLoading(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await axios.get(`${base}/api/schemes/${slug}`);
            setScheme(res.data);
        } catch (err) {
            console.error("Error fetching scheme details:", err);
            setError("Failed to load scheme details.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground font-medium">Preparing information for you...</p>
                </div>
            </Layout>
        );
    }

    if (error || !scheme) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <p className="text-destructive font-bold text-xl">{error || "Scheme not found"}</p>
                    <Button variant="outline" onClick={() => navigate("/schemes")} className="rounded-full px-8">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-10">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/schemes")}
                    className="group hover:bg-transparent p-0 h-auto text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Listings
                </Button>

                {/* Title Section */}
                <div className="space-y-4">
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1">
                        Official Scheme
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground/90 leading-[1.1]">
                        {scheme.title}
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
                        {scheme.description}
                    </p>
                </div>

                {/* Essential Highlights Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {/* Box 1: Benefit & Time Period */}
                    <Card className="bg-secondary/20 border-border/40 overflow-hidden hover:border-primary/20 transition-all duration-300">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                                    Scheme Details
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-medium">Financial Aid</p>
                                    <p className="text-lg font-bold text-foreground/90 leading-tight">
                                        {scheme.financial_aid || "Check locally"}
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-medium">Duration</p>
                                    <p className="text-lg font-bold text-foreground/90 leading-tight">
                                        {scheme.duration || "Ongoing"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Box 2: Where to Apply & Official Link */}
                    <Card className="bg-secondary/20 border-border/40 overflow-hidden hover:border-primary/20 transition-all duration-300">
                        <CardContent className="p-5 space-y-4 flex flex-col justify-between h-full">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                                        Where to Apply
                                    </h3>
                                </div>

                                <p className="text-base font-semibold text-foreground/80 leading-snug">
                                    {scheme.how_to_apply || "Contact Panchayat office"}
                                </p>
                            </div>

                            {scheme.official_link && (
                                <Button
                                    size="sm"
                                    onClick={() => window.open(scheme.official_link, '_blank')}
                                    className="w-full mt-2 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border-none font-bold rounded-xl transition-all"
                                >
                                    Official Website <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 pt-4">
                    {/* Key Benefits - Main Area */}
                    <div className="lg:col-span-3 space-y-6">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                            What you will get
                        </h2>
                        <div className="space-y-4">
                            {scheme.benefits && scheme.benefits.map((benefit, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-4 bg-primary/5 p-5 rounded-3xl border border-primary/10 hover:border-primary/30 transition-colors"
                                >
                                    <div className="h-3 w-3 rounded-full bg-primary shrink-0 shadow-[0_0_10px_rgba(var(--primary),0.3)]" />
                                    <p className="text-lg font-bold text-foreground/80 leading-snug">{benefit}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Simple Steps - Sidebar style */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Info className="h-8 w-8 text-primary" />
                            Next Steps
                        </h2>
                        <div className="relative space-y-8 pl-6">
                            {/* Vertical line connector - centered with circles (pl-6 + 20px radius) */}
                            <div className="absolute left-[44px] -translate-x-1/2 top-6 bottom-6 w-[2px] bg-primary/20" />

                            {scheme.applicationProcess && scheme.applicationProcess.map((step, idx) => (
                                <div key={idx} className="relative flex items-center gap-6 group">
                                    <div className="h-10 w-10 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center text-primary font-black shadow-sm group-hover:border-primary transition-colors z-10 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="bg-secondary/20 p-4 rounded-2xl border border-secondary/40 w-full group-hover:border-primary/20 transition-colors">
                                        <p className="font-bold text-foreground/80 leading-relaxed">{step}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                        <p>Public Information Service</p>
                    </div>
                    {scheme.source && !scheme.official_link && (
                        <a
                            href={scheme.source}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary transition-colors flex items-center gap-1"
                        >
                            Wiki Source <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                    )}
                </div>
            </div>
        </Layout>
    );
}
