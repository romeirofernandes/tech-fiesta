import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft,
    ExternalLink,
    CheckCircle2,
    Info,
    Wallet,
    Calendar,
    MapPin
} from "lucide-react";
import axios from "axios";

export default function SchemeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [scheme, setScheme] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchScheme();
    }, [id]);

    const fetchScheme = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/api/schemes/${id}`
            );
            setScheme(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching scheme:", error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-muted-foreground">Loading scheme details...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!scheme) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-muted-foreground">Scheme not found</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate("/schemes")}
                    className="group hover:bg-transparent p-0 h-auto text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to All Schemes
                </Button>

                {/* Header Section */}
                <div className="space-y-6 pb-8 border-b border-border/50">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Official Government Scheme</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-foreground leading-tight">
                        {scheme.title}
                    </h1>

                    <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                        {scheme.description}
                    </p>

                    {scheme.official_link && (
                        <Button
                            size="lg"
                            onClick={() => window.open(scheme.official_link, '_blank')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
                        >
                            Apply Online Now <ExternalLink className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-border/50 hover:border-primary/30 transition-all">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Wallet className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financial Aid</p>
                                    <p className="text-2xl font-bold text-foreground">{scheme.financial_aid || "Check Locally"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 hover:border-primary/30 transition-all">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Calendar className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration</p>
                                    <p className="text-2xl font-bold text-foreground">{scheme.duration || "Ongoing"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 hover:border-primary/30 transition-all">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <MapPin className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apply At</p>
                                    <p className="text-lg font-bold text-foreground leading-tight">{scheme.how_to_apply || "Panchayat Office"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Benefits Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">Key Benefits</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scheme.benefits && scheme.benefits.map((benefit, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-4 p-5 rounded-2xl bg-secondary/20 border border-border/40 hover:border-primary/30 hover:bg-secondary/30 transition-all"
                            >
                                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                                    {idx + 1}
                                </div>
                                <p className="text-base font-medium text-foreground/90 leading-relaxed">
                                    {benefit}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Application Process with Vertical Timeline */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Info className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">How to Apply</h2>
                    </div>

                    <div className="relative pl-8 space-y-6">
                        {/* Vertical Timeline Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

                        {scheme.applicationProcess && scheme.applicationProcess.map((step, idx) => (
                            <div key={idx} className="relative flex items-start gap-6 group">
                                {/* Timeline Circle */}
                                <div className="h-10 w-10 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-bold shadow-sm z-10 shrink-0">
                                    {idx + 1}
                                </div>

                                {/* Step Content */}
                                <div className="flex-1 bg-secondary/10 p-5 rounded-xl border border-border/40 group-hover:bg-secondary/20 group-hover:border-primary/30 transition-all">
                                    <p className="text-base font-semibold text-foreground/90 leading-relaxed">
                                        {step}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Help Box */}
                    <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 border-dashed">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Info className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <p className="font-bold text-foreground">Need Help?</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Visit your nearest Common Service Center (CSC) or contact your local Panchayat officer for assistance with the application process.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-medium">Verified Government Data</span>
                    </div>
                    {scheme.source && !scheme.official_link && (
                        <a
                            href={scheme.source}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                        >
                            View Source <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                </div>
            </div>
        </Layout>
    );
}
