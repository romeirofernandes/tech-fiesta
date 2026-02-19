import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from "@/context/UserContext";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  X,
  RefreshCw,
  Settings2,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import HeartRateThresholds from "./alerts/HeartRateThresholds";

const SEVERITY_STYLES = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-chart-5/10 text-chart-5",
  low: "bg-muted text-muted-foreground",
};

const TYPE_ICONS = {
  health: "🩺",
  vaccination: "💉",
  inactivity: "😴",
};

export default function Alerts() {
  const { mongoUser } = useUser();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Stats (from non-paginated call)
  const [stats, setStats] = useState({
    active: 0,
    critical: 0,
    resolved: 0,
    total: 0,
    avgResponseHours: 0,
    todayCount: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/alerts`,
        { params: { farmerId: mongoUser?._id } }
      );
      const allAlerts = response.data || [];
      const active = allAlerts.filter((a) => !a.isResolved);
      const critical = active.filter((a) => a.severity === "high");
      const resolved = allAlerts.filter((a) => a.isResolved && a.resolvedAt);
      const today = allAlerts.filter(
        (a) =>
          new Date(a.createdAt).toDateString() === new Date().toDateString()
      );

      const avgResponseHours =
        resolved.length > 0
          ? resolved.reduce((sum, a) => {
              return (
                sum +
                (new Date(a.resolvedAt) - new Date(a.createdAt)) /
                  (1000 * 60 * 60)
              );
            }, 0) / resolved.length
          : 0;

      setStats({
        active: active.length,
        critical: critical.length,
        resolved: resolved.length,
        total: allAlerts.length,
        avgResponseHours,
        todayCount: today.length,
      });
    } catch (error) {
      console.error("Error fetching alert stats:", error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (search) params.search = search;
      if (statusFilter === "active") params.isResolved = "false";
      if (statusFilter === "resolved") params.isResolved = "true";
      if (typeFilter !== "all") params.type = typeFilter;
      if (severityFilter !== "all") params.severity = severityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/alerts`,
        { params: { ...params, farmerId: mongoUser?._id } }
      );

      if (response.data.alerts) {
        setAlerts(response.data.alerts);
        setTotal(response.data.total);
        setTotalPages(response.data.totalPages);
      } else {
        setAlerts(response.data || []);
        setTotal((response.data || []).length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, typeFilter, severityFilter, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (mongoUser) {
      fetchStats();
    }
  }, [fetchStats, mongoUser]);

  useEffect(() => {
    if (mongoUser) {
      fetchAlerts();
    }
  }, [fetchAlerts, mongoUser]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, severityFilter, startDate, endDate, limit]);

  const resolveAlert = async (alertId) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/alerts/${alertId}/resolve`
      );
      toast.success("Alert resolved successfully");
      fetchAlerts();
      fetchStats();
    } catch (error) {
      toast.error("Failed to resolve alert");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSeverityFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters =
    search ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    severityFilter !== "all" ||
    startDate ||
    endDate;

  const renderPaginationLinks = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPageNum = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPageNum - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPageNum - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPageNum; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={page === i} onClick={() => setPage(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPageNum < totalPages) {
      if (endPageNum < totalPages - 1) {
        items.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => setPage(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <Layout loading={loading && alerts.length === 0}>
      <div className="space-y-6 max-w-full px-6 mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Alerts</h1>
            <p className="text-muted-foreground mt-1">
              Monitor health alerts, vaccination reminders, and activity
              warnings
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAlerts();
              fetchStats();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: "ACTIVE ALERTS",
              val: stats.active,
              icon: Bell,
              color: "text-chart-2",
              bg: "bg-chart-2/10",
              sub: `${stats.todayCount} new today`,
            },
            {
              label: "CRITICAL",
              val: stats.critical,
              icon: AlertTriangle,
              color: "text-destructive",
              bg: "bg-destructive/10",
              sub: "Immediate action",
            },
            {
              label: "RESOLUTION RATE",
              val: `${
                stats.total > 0
                  ? Math.round((stats.resolved / stats.total) * 100)
                  : 0
              }%`,
              icon: CheckCircle2,
              color: "text-primary",
              bg: "bg-primary/10",
              sub: `${stats.resolved} total resolved`,
            },
            {
              label: "AVG RESPONSE",
              val: `${stats.avgResponseHours.toFixed(1)}h`,
              icon: Clock,
              color: "text-muted-foreground",
              bg: "bg-muted",
              sub: "Resolution time",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
            >
              <div className={`${item.bg} p-3 rounded-lg`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {item.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {item.val}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {item.sub}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs for Alerts / Thresholds */}
        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Heart Rate Thresholds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search alerts by message..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="vaccination">Vaccination</SelectItem>
                        <SelectItem value="inactivity">Inactivity</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={severityFilter}
                      onValueChange={setSeverityFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex gap-3 flex-1">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1 block">
                          From
                        </label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1 block">
                          To
                        </label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={String(limit)}
                        onValueChange={(v) => setLimit(Number(v))}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 / page</SelectItem>
                          <SelectItem value="20">20 / page</SelectItem>
                          <SelectItem value="50">50 / page</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-9"
                        >
                          <X className="mr-1 h-4 w-4" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4">
                      Timestamp
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4">
                      Animal
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4">
                      Farm
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4">
                      Type
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4">
                      Message
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4">
                      Severity
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4">
                      Status
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold px-4 text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground text-sm"
                      >
                        Loading alerts...
                      </TableCell>
                    </TableRow>
                  ) : alerts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground text-sm"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Bell className="h-8 w-8 text-muted-foreground/50" />
                          <p>No alerts found matching your filters</p>
                          {hasActiveFilters && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={clearFilters}
                            >
                              Clear all filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow
                        key={alert._id}
                        className={
                          !alert.isResolved ? "bg-destructive/[0.02]" : ""
                        }
                      >
                        <TableCell className="px-4">
                          <span className="text-muted-foreground font-mono text-xs">
                            {new Date(alert.createdAt).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-foreground">
                              {alert.animalId?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {alert.animalId?.rfid || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4">
                          <span className="text-sm text-muted-foreground">
                            {alert.animalId?.farmId?.name || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex items-center gap-1.5">
                            <span>{TYPE_ICONS[alert.type] || "📋"}</span>
                            <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                              {alert.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 max-w-[250px]">
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {alert.message}
                          </span>
                        </TableCell>
                        <TableCell className="px-4">
                          <Badge
                            className={`text-[9px] uppercase font-bold border-none px-2 py-0.5 rounded-sm ${
                              SEVERITY_STYLES[alert.severity] ||
                              SEVERITY_STYLES.low
                            }`}
                          >
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4">
                          {alert.isResolved ? (
                            <Badge
                              variant="outline"
                              className="border-primary/20 text-primary text-[10px] bg-primary/5"
                            >
                              Resolved
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-destructive/20 text-destructive text-[10px] bg-destructive/5"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          {!alert.isResolved && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resolveAlert(alert._id)}
                              className="h-8 text-[10px] uppercase font-bold"
                            >
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-border px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {(page - 1) * limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(page * limit, total)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">{total}</span>{" "}
                    alerts
                  </p>
                  <Pagination className="w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(Math.max(1, page - 1))}
                          className={
                            page === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                      {renderPaginationLinks()}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage(Math.min(totalPages, page + 1))
                          }
                          className={
                            page === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="thresholds">
            <HeartRateThresholds />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
