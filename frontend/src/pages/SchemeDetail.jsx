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
    MapPin,
    Award
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
            <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate("/schemes")}
                    className="group hover:bg-transparent p-0 h-auto text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to All Schemes
                </Button>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Main Info (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Header Section */}
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Official Government Scheme</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                                {scheme.title}
                            </h1>

                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {scheme.description}
                            </p>

                            {scheme.official_link && (
                                <Button
                                    size="lg"
                                    onClick={() => window.open(scheme.official_link, '_blank')}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-base rounded-2xl shadow-lg hover:shadow-xl transition-all"
                                >
                                    Apply Online Now <ExternalLink className="ml-2 h-5 w-5" />
                                </Button>
                            )}
                        </div>

                        {/* Benefits Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Award className="h-6 w-6 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">Key Benefits</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {scheme.benefits && scheme.benefits.map((benefit, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-4 rounded-xl bg-secondary/20 border border-border/40 hover:border-primary/30 hover:bg-secondary/30 transition-all"
                                    >
                                        <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                                            {benefit}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Application Process with Vertical Timeline */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Info className="h-6 w-6 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">How to Apply</h2>
                            </div>

                            <div className="relative space-y-4">
                                {/* Vertical Timeline Line - centered through the circles */}
                                <div className="absolute left-[15px] top-[20px] bottom-[20px] w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

                                {scheme.applicationProcess && scheme.applicationProcess.map((step, idx) => (
                                    <div key={idx} className="relative flex items-start gap-4 group">
                                        {/* Timeline Circle */}
                                        <div className="relative h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-bold text-sm shadow-sm z-10 shrink-0">
                                            {idx + 1}
                                        </div>

                                        {/* Step Content */}
                                        <div className="flex-1 bg-secondary/10 p-4 rounded-xl border border-border/40 group-hover:bg-secondary/20 group-hover:border-primary/30 transition-all">
                                            <p className="text-sm font-semibold text-foreground/90 leading-relaxed">
                                                {step}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Info & Help (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Quick Info Cards */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-foreground">Quick Information</h3>

                            <Card className="border-border/50 hover:border-primary/30 transition-all">
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                            <Wallet className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financial Aid</p>
                                            <p className="text-lg font-bold text-foreground">{scheme.financial_aid || "Check Locally"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 hover:border-primary/30 transition-all">
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                            <Calendar className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration</p>
                                            <p className="text-lg font-bold text-foreground">{scheme.duration || "Ongoing"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 hover:border-primary/30 transition-all">
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                            <MapPin className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apply At</p>
                                            <p className="text-sm font-bold text-foreground leading-tight">{scheme.how_to_apply || "Panchayat Office"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Help Box */}
                        <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/20 border-dashed sticky top-24">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Info className="h-5 w-5 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-bold text-foreground">Need Help?</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Visit your nearest Common Service Center (CSC) or contact your local Panchayat officer for assistance with the application process.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="space-y-3 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium text-muted-foreground">Verified Government Data</span>
                            </div>
                            {scheme.source && !scheme.official_link && (
                                <a
                                    href={scheme.source}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 hover:text-primary transition-colors text-xs font-medium text-muted-foreground"
                                >
                                    View Source <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
