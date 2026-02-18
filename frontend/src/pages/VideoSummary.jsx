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

                {/* KPI Cards Row */}
                {!loading && summaryData && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard
                            icon={Beef}
                            label="Total Animals"
                            value={stats.totalAnimals}
                            subtext={`${speciesEntries.length} species`}
                            color="text-primary"
                            bgColor="bg-primary/10"
                        />
                        <StatCard
                            icon={Tractor}
                            label="Total Farms"
                            value={summaryData.farmCount}
                            color="text-chart-1"
                            bgColor="bg-chart-1/10"
                        />
                        <StatCard
                            icon={DollarSign}
                            label="Revenue (30d)"
                            value={`₹${(revenue / 1000).toFixed(1)}k`}
                            fullValue={`₹${revenue.toLocaleString('en-IN')}`}
                            color="text-green-600"
                            bgColor="bg-green-500/10"
                        />
                        <StatCard
                            icon={Syringe}
                            label="Vaccinations"
                            value={stats.vaccinationsLast30Days}
                            color="text-chart-2"
                            bgColor="bg-chart-2/10"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            label="Health Alerts"
                            value={stats.healthAlerts}
                            color={stats.healthAlerts > 0 ? 'text-destructive' : 'text-primary'}
                            bgColor={stats.healthAlerts > 0 ? 'bg-destructive/10' : 'bg-primary/10'}
                        />
                    </div>
                )}

                {/* Main Video Section */}
                <div className="w-full">
                    <Card className="overflow-hidden border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                        <CardHeader className="py-2 px-4 border-b border-border/40">
                            <CardTitle className="flex items-center gap-2">
                                <Play className="h-5 w-5 fill-primary text-primary" />
                                Your Farm Report
                            </CardTitle>
                        </CardHeader>
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

                {/* Detailed Stats Grid */}
                {!loading && summaryData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Species Breakdown */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Beef className="h-4 w-4 text-primary" />
                                    Species Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {speciesEntries.length > 0 ? (
                                    <div className="space-y-4">
                                        {speciesEntries.map(([species, count]) => {
                                            const pct = stats.totalAnimals > 0 ? Math.round((count / stats.totalAnimals) * 100) : 0;
                                            return (
                                                <div key={species}>
                                                    <div className="flex justify-between text-sm mb-1.5">
                                                        <span className="capitalize font-medium">{species}</span>
                                                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary rounded-full transition-all duration-1000" 
                                                            style={{ width: `${pct}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No animals registered.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Production */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Package className="h-4 w-4 text-chart-3" />
                                    Production (30 Days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {productionEntries.length > 0 ? (
                                    <div className="space-y-3">
                                        {productionEntries.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-md bg-muted/40">
                                                <span className="capitalize text-sm font-medium">{p._id}</span>
                                                <Badge variant="secondary" className="font-mono">
                                                    {p.totalQuantity} {p.unit}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No production records found.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Financials */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    Financial Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Revenue</span>
                                        <span className="font-semibold text-green-600">₹{revenue.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Expenses</span>
                                        <span className="font-semibold text-red-500">₹{expenseTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between items-center">
                                        <span className="text-sm font-medium">Net Profit</span>
                                        <div className={`flex items-center gap-1.5 font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                            ₹{Math.abs(profit).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Farms */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Tractor className="h-4 w-4 text-chart-1" />
                                    Your Farms
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {summaryData?.farms && summaryData.farms.length > 0 ? (
                                    <div className="space-y-3">
                                        {summaryData.farms.slice(0, 3).map(f => ( // Limit to 3 to keep height consistent
                                            <div key={f._id} className="flex justify-between items-center p-2.5 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
                                                <span className="text-sm font-medium">{f.name}</span>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                                    <MapPin className="h-3 w-3" />
                                                    {f.location ? f.location.split(',')[0] : 'No location'}
                                                </div>
                                            </div>
                                        ))}
                                        {summaryData.farms.length > 3 && (
                                            <p className="text-xs text-center text-muted-foreground pt-1">
                                                + {summaryData.farms.length - 3} more farms
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No farms found.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
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
