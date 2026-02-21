import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Sparkles, TrendingUp, ShieldCheck, HeartPulse, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import mermaid from "mermaid";

/* ─── Mermaid Configuration for MAXIMUM visibility ─── */
mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: {
        primaryColor: "#f0fdf4",
        primaryTextColor: "#166534",
        primaryBorderColor: "#16a34a",
        lineColor: "#22c55e",
        secondaryColor: "#ffffff",
        tertiaryColor: "#ffffff",
        fontFamily: "inherit",
        fontSize: "14px",
        clusterBkg: "#f8fafc",
        nodeBorder: "#16a34a",
    },
    flowchart: {
        curve: "smooth",
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50,
        htmlLabels: true
    },
});

/* ─── Big Beautiful Mermaid Chart Component ─── */
function BeautifulActionPlan({ steps }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!steps?.length || !ref.current) return;

        const safeStr = (s) => s.replace(/[^a-zA-Z0-9 ]/g, "").trim().substring(0, 40);
        const lines = ["graph LR"];

        const palettes = [
            { fill: "#dbeafe", stroke: "#3b82f6", color: "#1e3a8a" }, // Blue
            { fill: "#fef3c7", stroke: "#f59e0b", color: "#78350f" }, // Yellow/Amber
            { fill: "#e0e7ff", stroke: "#6366f1", color: "#312e81" }, // Indigo
            { fill: "#dcfce7", stroke: "#22c55e", color: "#14532d" }, // Green
            { fill: "#fce7f3", stroke: "#ec4899", color: "#831843" }, // Pink
        ];

        steps.forEach((step, i) => {
            const id = step.id || `M${i}`;
            const label = safeStr(step.label);
            const desc = step.desc ? `<br/><small style="opacity:0.8">(${safeStr(step.desc)})</small>` : "";

            lines.push(`  ${id}(["<div style='text-align:center'><b>${label}</b>${desc}</div>"])`);

            if (i > 0) {
                const prevId = steps[i - 1].id || `M${i - 1}`;
                lines.push(`  ${prevId} -.-> ${id}`);
            }
        });

        steps.forEach((step, i) => {
            const id = step.id || `M${i}`;
            const p = palettes[i % palettes.length];
            lines.push(`  style ${id} fill:${p.fill},stroke:${p.stroke},stroke-width:2px,color:${p.color}`);
        });
        const idStr = `mermaid-report-${Date.now()}`;
        mermaid.render(idStr, lines.join("\n")).then(({ svg }) => {
            if (ref.current) ref.current.innerHTML = svg;
        }).catch((e) => {
            console.error(e);
            if (ref.current) ref.current.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">Flowchart rendering failed</p>';
        });
    }, [steps]);

    return <div ref={ref} className="w-full flex justify-center py-2 [&_svg]:max-w-full [&_svg]:h-auto" />;
}


/* ─── Main Report Approach ─── */
export default function FarmInsights() {
    const { mongoUser } = useUser();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const fetchInsights = useCallback(async () => {
        if (!mongoUser?._id) return;
        setLoading(true); setError(null);
        try {
            const r = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/insights/farm?farmerId=${mongoUser._id}`);
            if (r.data.success && r.data.data) {
                setData(r.data.data.insights || r.data.data);
            }
        } catch (e) {
            setError(e.response?.data?.message || "Failed to load advice.");
            toast.error("Advice load failed");
        }
        finally { setLoading(false); }
    }, [mongoUser]);

    useEffect(() => { if (mongoUser?._id) fetchInsights(); }, [mongoUser, fetchInsights]);

    return (
        <Layout>
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* Header Setup */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2.5 rounded-xl">
                            <span className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">AI Strategy Report</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Your personalized agricultural advisory</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={fetchInsights} disabled={loading} className="gap-2 h-10 px-5 rounded-full shadow-sm hover:bg-primary/5 hover:text-primary">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Generate Fresh Report
                    </Button>
                </div>

                {/* Loading */}
                {loading && !data && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                            <Loader2 className="h-12 w-12 text-primary animate-spin relative" />
                        </div>
                        <p className="text-lg font-medium text-muted-foreground animate-pulse">Reading your farm's data...</p>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <h3 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h3>
                        <p className="text-muted-foreground mb-6">{error}</p>
                        <Button onClick={fetchInsights}><RefreshCw className="mr-2 h-4 w-4" /> Try Again</Button>
                    </div>
                )}

                {/* THE ADVICE REPORT (HORIZONTAL FIRST) */}
                {data && !loading && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch animate-in fade-in duration-700 slide-in-from-bottom-6">

                        {/* LEFT COLUMN: Main Report & Visuals (Spans 8 cols) */}
                        <div className="xl:col-span-8 flex flex-col gap-6 min-w-0 h-full">

                            {/* Executive Summary Panel */}
                            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                                        {data.greeting || "Hello, here is your farm report!"}
                                    </h2>
                                </div>
                                <p className="text-base sm:text-lg text-foreground/80 leading-relaxed font-medium">
                                    {data.executive_summary || "We have analyzed your recent production and market trends. Here is what you need to focus on next."}
                                </p>
                            </div>
                            {/* Expected Flow / Plan (Mermaid) */}
                            {data.mermaid_flowchart_steps?.length > 0 && (
                                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm overflow-hidden">
                                    <div className="mb-4 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                        <h3 className="text-xl font-bold">Recommended Action Plan</h3>
                                    </div>
                                    <div className="bg-muted/30 rounded-2xl border border-muted/50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
                                        {/* The nested div ensures it doesn't cause page-level horizontal scroll, but can scroll internally if absolutely necessary on tiny screens, while staying horizontal-first on typical displays */}
                                        <div className="w-full overflow-hidden">
                                            <BeautifulActionPlan steps={data.mermaid_flowchart_steps} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Focused Advice (Money & Health) Side-by-Side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">

                                {/* Money Box */}
                                {data.financial_advice && (
                                    <div className="bg-card border border-border/60 hover:border-primary/30 transition-colors rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-center h-full">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="bg-chart-4/10 p-2.5 rounded-xl shrink-0">
                                                <TrendingUp className="h-5 w-5 text-chart-4" />
                                            </div>
                                            <h3 className="text-xl font-bold">Money & Markets</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-lg font-semibold text-foreground mb-2">{data.financial_advice.title}</h4>
                                                <p className="text-base text-foreground/75 leading-relaxed">
                                                    {data.financial_advice.observation}
                                                </p>
                                            </div>
                                            <div className="bg-chart-4/5 rounded-2xl p-4 border border-chart-4/20">
                                                <p className="text-base font-medium flex items-start gap-3 text-foreground/90">
                                                    <CheckCircle2 className="h-5 w-5 text-chart-4 shrink-0 mt-0.5" />
                                                    <span className="leading-snug">{data.financial_advice.action}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Health Box */}
                                {data.health_advice && (
                                    <div className="bg-card border border-border/60 hover:border-primary/30 transition-colors rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-center h-full">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="bg-chart-2/10 p-2.5 rounded-xl shrink-0">
                                                <HeartPulse className="h-5 w-5 text-chart-2" />
                                            </div>
                                            <h3 className="text-xl font-bold">Herd Health</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-lg font-semibold text-foreground mb-2">{data.health_advice.title}</h4>
                                                <p className="text-base text-foreground/75 leading-relaxed">
                                                    {data.health_advice.observation}
                                                </p>
                                            </div>
                                            <div className="bg-chart-2/5 rounded-2xl p-4 border border-chart-2/20">
                                                <p className="text-base font-medium flex items-start gap-3 text-foreground/90">
                                                    <ShieldCheck className="h-5 w-5 text-chart-2 shrink-0 mt-0.5" />
                                                    <span>{data.health_advice.action}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Actionable Steps & Footer Info (Spans 4 cols) */}
                        <div className="xl:col-span-4 flex flex-col gap-6 min-w-0 h-full">

                            {/* Actionable Steps (takes up available space) */}
                            {data.actionable_tips?.length > 0 && (
                                <div className="bg-muted/10 border border-border rounded-3xl p-6 shadow-sm flex-1 flex flex-col overflow-hidden">
                                    <h3 className="text-xl font-bold mb-5 flex items-center gap-2 shrink-0">
                                        <CheckCircle2 className="h-5 w-5 text-primary" /> What to do next
                                    </h3>
                                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                        {data.actionable_tips.map((tip, idx) => (
                                            <div key={idx} className="group bg-card border border-border hover:border-primary/40 focus-within:border-primary/40 transition-colors rounded-2xl p-4 shadow-sm flex gap-4 items-start">

                                                <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                    {idx + 1}
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                                                    <h4 className="text-base font-bold text-foreground truncate">{tip.heading}</h4>
                                                    <p className="text-muted-foreground text-sm leading-snug">{tip.explanation}</p>

                                                    <div className="inline-flex items-start gap-2 mt-2 px-3 py-2 bg-primary/5 rounded-xl text-primary text-sm font-medium border border-primary/10 w-full">
                                                        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <span className="leading-snug">{tip.step}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer Tip (Pushed to bottom) */}
                            {data.market_tip && (
                                <div className="bg-chart-5/10 border border-chart-5/20 rounded-3xl p-6 flex items-start gap-4 shrink-0">
                                    <div className="bg-white dark:bg-black p-2 rounded-full shrink-0 shadow-sm">
                                        <span className="text-xl">💡</span>
                                    </div>
                                    <div>
                                        <h4 className="text-chart-5 font-bold text-sm uppercase tracking-wider mb-1">Closing Thought</h4>
                                        <p className="text-base font-medium text-foreground leading-snug">{data.market_tip}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
