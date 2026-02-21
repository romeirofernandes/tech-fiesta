import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/context/UserContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Video,
  Type,
  Download,
  Loader2,
  Beef,
  DollarSign,
  Syringe,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL;

export default function Reports() {
  const { mongoUser } = useUser();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("text");
  const printRef = useRef(null);

  useEffect(() => {
    if (!mongoUser?._id) return;
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/summary/${mongoUser._id}`);
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        const data = await res.json();
        setSummaryData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [mongoUser]);

  const handlePrint = () => {
    window.print();
  };

  if (!mongoUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Please log in to view reports.</p>
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
  const dateStr = summaryData?.summaryDate
    ? new Date(summaryData.summaryDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const tabs = [
    { id: "text", label: "Text Summary", icon: Type },
    { id: "pdf", label: "PDF Report", icon: FileText },
    { id: "video", label: "Video Report", icon: Video },
  ];

  return (
    <Layout loading={loading}>
      <div className="space-y-6 px-4 md:px-6 lg:px-8 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farm Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View your farm performance in text, PDF, or video format
          </p>
        </div>

        {/* Error */}
        {error && !loading && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Failed to load data: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Tab selector */}
        {!loading && summaryData && (
          <>
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* ── TEXT SUMMARY ── */}
            {activeTab === "text" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Quick Summary</CardTitle>
                        <CardDescription>{dateStr}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {summaryData.farmCount} Farm{summaryData.farmCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Livestock */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Beef className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Livestock
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <MiniStat label="Total" value={stats?.totalAnimals || 0} />
                        <MiniStat label="Male" value={stats?.genderBreakdown?.male || 0} />
                        <MiniStat label="Female" value={stats?.genderBreakdown?.female || 0} />
                      </div>
                      {speciesEntries.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {speciesEntries.map(([species, count]) => (
                            <Badge key={species} variant="outline" className="text-xs capitalize">
                              {species}: {count}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t" />

                    {/* Production */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Production (30 days)
                        </h3>
                      </div>
                      {productionEntries.length > 0 ? (
                        <div className="space-y-2">
                          {productionEntries.map((p, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
                            >
                              <span className="capitalize">{p._id}</span>
                              <span className="font-semibold">
                                {p.totalQuantity} {p.unit || ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No production records</p>
                      )}
                    </div>

                    <div className="border-t" />

                    {/* Finance */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Finance (30 days)
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <MiniStat
                          label="Revenue"
                          value={`₹${revenue.toLocaleString("en-IN")}`}
                        />
                        <MiniStat
                          label="Expenses"
                          value={`₹${expenseTotal.toLocaleString("en-IN")}`}
                        />
                        <MiniStat
                          label={profit >= 0 ? "Profit" : "Loss"}
                          value={`₹${Math.abs(profit).toLocaleString("en-IN")}`}
                          highlight={profit >= 0 ? "green" : "red"}
                        />
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Health */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Syringe className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Health & Vaccinations (30 days)
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <MiniStat
                          label="Vaccinations"
                          value={stats?.vaccinationsLast30Days || 0}
                        />
                        <MiniStat
                          label="Health Alerts"
                          value={stats?.healthAlerts || 0}
                          highlight={stats?.healthAlerts > 0 ? "red" : undefined}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── PDF REPORT ── */}
            {activeTab === "pdf" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">PDF Report</CardTitle>
                    <CardDescription>
                      Print or save this report as a PDF using your browser's print dialog
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handlePrint} className="gap-2">
                      <Download className="h-4 w-4" /> Download / Print PDF
                    </Button>
                  </CardContent>
                </Card>

                {/* Printable content */}
                <div ref={printRef} className="print-report">
                  <Card>
                    <CardContent className="p-8 space-y-8">
                      {/* Header */}
                      <div className="text-center border-b pb-6">
                        <h1 className="text-2xl font-bold">PashuPalak — Farm Report</h1>
                        <p className="text-muted-foreground mt-1">
                          {summaryData?.farmerName} &middot; {dateStr}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {summaryData?.farmCount} Farm{summaryData?.farmCount !== 1 ? "s" : ""}
                          {summaryData?.farms?.map((f) => f.name).join(", ")
                            ? ` — ${summaryData.farms.map((f) => f.name).join(", ")}`
                            : ""}
                        </p>
                      </div>

                      {/* Livestock section */}
                      <div>
                        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                          <Beef className="h-4 w-4" /> Livestock Overview
                        </h2>
                        <div className="grid grid-cols-4 gap-3">
                          <PrintStat label="Total Animals" value={stats?.totalAnimals || 0} />
                          <PrintStat label="Male" value={stats?.genderBreakdown?.male || 0} />
                          <PrintStat label="Female" value={stats?.genderBreakdown?.female || 0} />
                          <PrintStat label="Species" value={speciesEntries.length} />
                        </div>
                        {speciesEntries.length > 0 && (
                          <div className="mt-3 text-sm text-muted-foreground">
                            {speciesEntries.map(([s, c]) => `${s}: ${c}`).join(" · ")}
                          </div>
                        )}
                      </div>

                      {/* Production section */}
                      <div>
                        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" /> Production (Last 30 Days)
                        </h2>
                        {productionEntries.length > 0 ? (
                          <div className="space-y-1.5">
                            {productionEntries.map((p, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-sm border-b border-dashed pb-1"
                              >
                                <span className="capitalize">{p._id}</span>
                                <span className="font-medium">
                                  {p.totalQuantity} {p.unit || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No production records</p>
                        )}
                      </div>

                      {/* Finance section */}
                      <div>
                        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" /> Financial Summary (Last 30 Days)
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                          <PrintStat
                            label="Revenue"
                            value={`₹${revenue.toLocaleString("en-IN")}`}
                          />
                          <PrintStat
                            label="Expenses"
                            value={`₹${expenseTotal.toLocaleString("en-IN")}`}
                          />
                          <PrintStat
                            label={profit >= 0 ? "Net Profit" : "Net Loss"}
                            value={`₹${Math.abs(profit).toLocaleString("en-IN")}`}
                          />
                        </div>
                      </div>

                      {/* Health section */}
                      <div>
                        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                          <Syringe className="h-4 w-4" /> Health & Vaccinations (Last 30 Days)
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                          <PrintStat
                            label="Vaccinations Done"
                            value={stats?.vaccinationsLast30Days || 0}
                          />
                          <PrintStat
                            label="Health Alerts"
                            value={stats?.healthAlerts || 0}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="text-center border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                          Generated by PashuPalak &middot; {dateStr}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ── VIDEO REPORT ── */}
            {activeTab === "video" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Video Report</CardTitle>
                  <CardDescription>
                    Watch your animated farm performance video summary
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your farm data is visualized as an animated video with livestock stats,
                    production data, financial summary, and health metrics.
                  </p>
                  <Button onClick={() => navigate("/video-summary")} className="gap-2">
                    <Video className="h-4 w-4" /> Watch Video Summary
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Loading state */}
        {loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center text-center py-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-base font-semibold animate-pulse">Loading report data...</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </Layout>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </p>
      <p
        className={`text-lg font-bold mt-0.5 ${
          highlight === "green"
            ? "text-green-600 dark:text-green-400"
            : highlight === "red"
            ? "text-destructive"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PrintStat({ label, value }) {
  return (
    <div className="p-3 rounded-lg border">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
    </div>
  );
}
