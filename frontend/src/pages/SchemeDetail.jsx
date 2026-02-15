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
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 pb-20">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/schemes")}
                    className="group hover:bg-transparent p-0 h-auto text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Listings
                </Button>

                {/* Hero Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase tracking-[0.2em] font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Official Government Scheme
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] font-serif">
                            {scheme.title}
                        </h1>
                        <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-3xl">
                            {scheme.description}
                        </p>
                    </div>

                    {scheme.official_link && (
                        <div className="pt-2">
                            <Button
                                size="xl"
                                onClick={() => window.open(scheme.official_link, '_blank')}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl px-10 py-8 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all h-auto"
                            >
                                Apply Officially <ExternalLink className="ml-3 h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Horizontal Quick Stats Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <Card className="bg-gradient-to-br from-secondary/40 to-muted/20 border-border/40 hover:border-primary/20 transition-all shadow-sm">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest bg-muted/30 w-fit px-2 py-1 rounded-md">
                                <Wallet className="h-3.5 w-3.5" /> Financial Aid
                            </div>
                            <p className="text-3xl font-black text-foreground drop-shadow-sm">
                                {scheme.financial_aid || "Check locally"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-secondary/40 to-muted/20 border-border/40 hover:border-primary/20 transition-all shadow-sm">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest bg-muted/30 w-fit px-2 py-1 rounded-md">
                                <Calendar className="h-3.5 w-3.5" /> Scheme Duration
                            </div>
                            <p className="text-3xl font-black text-foreground drop-shadow-sm">
                                {scheme.duration || "Ongoing"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-secondary/40 to-muted/20 border-border/40 hover:border-primary/20 transition-all shadow-sm">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest bg-muted/30 w-fit px-2 py-1 rounded-md">
                                <MapPin className="h-3.5 w-3.5" /> Where to Apply
                            </div>
                            <p className="text-xl font-bold text-foreground/90 leading-snug">
                                {scheme.how_to_apply || "Local Panchayat Office"}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Sections - Using Full Width */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Benefits Section - Grid of Cards */}
                    <div className="lg:col-span-12 space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                Key Benefits
                            </h2>
                            <div className="h-[2px] flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scheme.benefits && scheme.benefits.map((benefit, idx) => (
                                <div
                                    key={idx}
                                    className="group relative flex flex-col gap-4 bg-muted/10 p-6 rounded-3xl border border-border/40 hover:border-primary/20 hover:bg-card transition-all duration-300 shadow-sm hover:shadow-md"
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {idx + 1}
                                    </div>
                                    <p className="text-base font-semibold text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                                        {benefit}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Full Width Application Process */}
                    <div className="lg:col-span-12 pt-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Info className="h-6 w-6" />
                                </div>
                                Application Process
                            </h2>
                            <div className="h-[2px] flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                            {scheme.applicationProcess && scheme.applicationProcess.map((step, idx) => (
                                <div key={idx} className="relative p-6 rounded-3xl border border-border/30 bg-secondary/5 group hover:bg-primary/[0.02] hover:border-primary/20 transition-all overflow-hidden">
                                    <div className="absolute -top-4 -right-4 text-8xl font-black text-primary/5 select-none pointer-events-none group-hover:text-primary/[0.08] transition-colors">
                                        {idx + 1}
                                    </div>
                                    <div className="h-10 w-10 rounded-2xl bg-background border-2 border-primary flex items-center justify-center text-primary font-black shadow-sm mb-4">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm font-bold text-foreground/80 leading-relaxed font-sans">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Meta */}
                <div className="pt-12 mt-12 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3 text-muted-foreground text-xs font-bold uppercase tracking-[0.2em]">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Official Data Verified Service
                    </div>
                    {scheme.source && !scheme.official_link && (
                        <a
                            href={scheme.source}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-muted/30 px-6 py-2.5 rounded-full border border-border/50 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary hover:border-primary/20 transition-all flex items-center gap-2"
                        >
                            Review on Wikipedia <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
            </div>
        </Layout>
    );
}
