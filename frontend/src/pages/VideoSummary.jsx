import React, { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { FarmerSummaryVideo } from '../components/video/FarmerSummaryVideo';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
    Beef,
    Tractor,
    Syringe,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Loader2,
    MapPin,
    Play
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL;
const FPS = 30;
const TOTAL_DURATION = 20 * FPS;

const VideoSummary = () => {
    const { mongoUser } = useUser();
    const { theme } = useTheme();
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!mongoUser || !mongoUser._id) return;

        const fetchSummary = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API}/api/summary/${mongoUser._id}`);
                if (!res.ok) throw new Error(`Server responded with ${res.status}`);
                const data = await res.json();
                setSummaryData(data);
            } catch (err) {
                console.error('Failed to fetch summary:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [mongoUser]);

    if (!mongoUser) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <p className="text-muted-foreground">Please log in to view your summary.</p>
                </div>
            </Layout>
        );
    }

    const stats = summaryData?.stats;
    const speciesEntries = stats ? Object.entries(stats.speciesBreakdown || {}) : [];
    const productionEntries = stats?.productionLast30Days || [];
    const revenue = stats?.salesLast30Days?.totalRevenue || 0;
    const expenseTotal = stats?.expensesLast30Days?.totalExpenses || 0;
    const profit = revenue - expenseTotal;

    return (
        <Layout loading={loading}>
            <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight font-serif">Video Summary</h1>
                    <p className="text-muted-foreground text-sm">
                        Your personalized farm performance report powered by real-time data
                    </p>
                </div>


                {/* Main Video Section */}
                <div className="w-full">
                    <Card className="overflow-hidden border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
            
                        <CardContent className="p-0">
                            <div className="aspect-video w-full bg-black flex items-center justify-center">
                                {loading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                        <p className="text-sm text-muted-foreground">Generating video...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center p-8">
                                        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3 opacity-80" />
                                        <p className="text-destructive font-medium">Failed to load summary</p>
                                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                                    </div>
                                ) : summaryData ? (
                                    <Player
                                        component={FarmerSummaryVideo}
                                        inputProps={{ data: summaryData, theme: theme || 'dark' }}
                                        durationInFrames={TOTAL_DURATION}
                                        fps={FPS}
                                        compositionWidth={1280}
                                        compositionHeight={720}
                                        style={{ width: '100%', height: '100%' }}
                                        controls
                                        autoPlay
                                    />
                                ) : (
                                    <p className="text-muted-foreground">No data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </Layout>
    );
};

// Helper Component for KPI Cards
const StatCard = ({ icon: Icon, label, value, subtext, fullValue, color, bgColor }) => (
    <Card>
        <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${bgColor}`}>
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
                <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-semibold tracking-tight" title={fullValue}>{value}</p>
                    {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
                </div>
            </div>
        </CardContent>
    </Card>
);

export default VideoSummary;
