import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertTriangle, 
  Heart,
  Download,
  AlertCircle,
  CheckCircle2,
  Activity,
  Building2,
  Search,
  MoreVertical,
  Eye,
  Flag,
  Calendar,
  MessageSquare,
  X,
  Loader2,
  MapPin,
  Users
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function HealthAnalytics() {
  const [data, setData] = useState({
    snapshots: [],
    animals: [],
    farms: [],
    alerts: [],
    loading: true
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [farmDetails, setFarmDetails] = useState(null);
  const [showFarmDialog, setShowFarmDialog] = useState(false);
  const [loadingFarm, setLoadingFarm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const [snapshotsRes, animalsRes, farmsRes, alertsRes] = await Promise.all([
        axios.get(`${baseURL}/api/health-snapshots`),
        axios.get(`${baseURL}/api/animals`),
        axios.get(`${baseURL}/api/farms`),
        axios.get(`${baseURL}/api/alerts`)
      ]);

      setData({
        snapshots: snapshotsRes.data || [],
        animals: animalsRes.data || [],
        farms: farmsRes.data || [],
        alerts: alertsRes.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to load data");
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchFarmDetails = async (farmId) => {
    try {
      setLoadingFarm(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      const response = await axios.get(`${baseURL}/api/admin/farms/${farmId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFarmDetails(response.data);
      setShowFarmDialog(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to load farm details");
    } finally {
      setLoadingFarm(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      setActionLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      await axios.put(`${baseURL}/api/admin/alerts/${alertId}/resolve`, {
        resolution: 'Resolved by admin',
        notes: 'Reviewed and addressed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Alert resolved");
      fetchData();
      if (farmDetails) {
        fetchFarmDetails(farmDetails.farm._id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to resolve alert");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagFarm = async (farmId) => {
    try {
      setActionLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      await axios.put(`${baseURL}/api/admin/farms/${farmId}/flag-review`, {
        reason: 'Flagged for administrative review',
        priority: 'high'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Farm flagged for review");
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to flag farm");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleInspection = async (farmId, inspectionData) => {
    try {
      setActionLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      await axios.post(`${baseURL}/api/admin/farms/${farmId}/inspection`, inspectionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Inspection scheduled");
      setShowInspectionDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to schedule inspection");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async (farmId, message, priority) => {
    try {
      setActionLoading(true);
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('token');
      await axios.post(`${baseURL}/api/admin/notifications`, {
        farmId,
        message,
        priority: priority || 'medium',
        type: 'health'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Notification sent");
      setShowNotificationDialog(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to send notification");
    } finally {
      setActionLoading(false);
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading health analytics...</p>
        </div>
      </div>
    );
  }

  const { snapshots, animals, farms, alerts } = data;

  // Calculate farm statistics
  const farmsWithStats = farms.map(farm => {
    const farmAnimals = animals.filter(a => {
      const fId = typeof a.farmId === 'object' ? a.farmId?._id : a.farmId;
      return fId === farm._id;
    });

    const farmAnimalIds = farmAnimals.map(a => a._id);
    const farmSnapshots = snapshots.filter(s => 
      farmAnimalIds.includes(s.animalId?._id || s.animalId)
    );

    const latestPerAnimal = {};
    farmSnapshots.forEach(s => {
      const aId = s.animalId?._id || s.animalId;
      if (!latestPerAnimal[aId]) latestPerAnimal[aId] = s;
    });
    const latestScores = Object.values(latestPerAnimal);

    const avgScore = latestScores.length > 0
      ? Math.round(latestScores.reduce((sum, s) => sum + s.score, 0) / latestScores.length)
      : null;

    const criticalCount = latestScores.filter(s => s.score < 40).length;
    const warningCount = latestScores.filter(s => s.score >= 40 && s.score < 60).length;

    const farmAlerts = alerts.filter(a => {
      const aId = a.animalId?._id || a.animalId;
      return farmAnimalIds.includes(aId) && !a.isResolved;
    }).length;

    let status = 'healthy';
    if (criticalCount > 0) status = 'critical';
    else if (warningCount > 0 || farmAlerts > 0) status = 'warning';

    return {
      ...farm,
      totalAnimals: farmAnimals.length,
      avgScore,
      criticalCount,
      warningCount,
      activeAlerts: farmAlerts,
      status,
      monitoredCount: latestScores.length
    };
  });

  // Apply filters
  const filteredFarms = farmsWithStats.filter(farm => {
    const matchesSearch = farm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farm.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || farm.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Overall statistics
  const stats = {
    totalFarms: farms.length,
    totalAnimals: animals.length,
    criticalFarms: farmsWithStats.filter(f => f.status === 'critical').length,
    totalAlerts: alerts.filter(a => !a.isResolved).length,
    avgHealthScore: farmsWithStats.filter(f => f.avgScore !== null).length > 0
      ? Math.round(farmsWithStats.filter(f => f.avgScore !== null).reduce((sum, f) => sum + (f.avgScore || 0), 0) / farmsWithStats.filter(f => f.avgScore !== null).length)
      : null
  };

  // Get data for tabs
  const inspections = alerts.filter(a => a.message?.toLowerCase().includes('inspection'));
  const notifications = alerts.filter(a => !a.message?.toLowerCase().includes('inspection') && !a.message?.toLowerCase().includes('flagged'));
  const flaggedFarms = farmsWithStats.filter(f => 
    alerts.some(a => {
      const farmAnimals = animals.filter(animal => {
        const fId = typeof animal.farmId === 'object' ? animal.farmId?._id : animal.farmId;
        return fId === f._id;
      });
      const farmAnimalIds = farmAnimals.map(animal => animal._id);
      return farmAnimalIds.includes(a.animalId?._id || a.animalId) && 
             a.message?.toLowerCase().includes('flagged') &&
             !a.isResolved;
    })
  );

  return (
    <div className="space-y-6 -mt-4 lg:-mt-6">
      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Farm Overview', icon: Building2 },
            { id: 'inspections', label: 'Inspections', icon: Calendar, badge: inspections.length },
            { id: 'notifications', label: 'Notifications', icon: MessageSquare, badge: notifications.filter(n => !n.isResolved).length },
            { id: 'flagged', label: 'Flagged Farms', icon: Flag, badge: flaggedFarms.length },
            { id: 'activity', label: 'Activity Log', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Farms</p>
                    <p className="text-3xl font-semibold tracking-tight text-foreground mt-2">{stats.totalFarms}</p>
                    <p className="text-xs text-muted-foreground mt-2">{stats.totalAnimals} animals</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Avg Health Score</p>
                    <p className="text-3xl font-semibold tracking-tight text-foreground mt-2">
                      {stats.avgHealthScore !== null ? `${stats.avgHealthScore}%` : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <Heart className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={stats.criticalFarms > 0 ? 'border-red-200 dark:border-red-900' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Critical Farms</p>
                    <p className="text-3xl font-semibold tracking-tight text-red-600 mt-2">{stats.criticalFarms}</p>
                    <p className="text-xs text-muted-foreground mt-2">Require attention</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                    <p className="text-3xl font-semibold tracking-tight text-foreground mt-2">{stats.totalAlerts}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Critical Farms Section */}
          {farmsWithStats.filter(f => f.status === 'critical').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Critical Farms - Immediate Attention Required
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">These farms have animals in critical condition</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {farmsWithStats.filter(f => f.status === 'critical').map(farm => (
                    <div key={farm._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{farm.name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">{farm.totalAnimals} animals</span>
                          <span>•</span>
                          <span className="text-red-600 font-semibold">{farm.criticalCount} critical cases</span>
                          {farm.activeAlerts > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-muted-foreground">{farm.activeAlerts} alerts</span>
                            </>
                          )}
                          {farm.avgScore !== null && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 font-semibold">Health: {farm.avgScore}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => fetchFarmDetails(farm._id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Animals
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedFarm(farm);
                              setShowInspectionDialog(true);
                            }}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Inspection
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedFarm(farm);
                              setShowNotificationDialog(true);
                            }}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Notification
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning Farms */}
          {farmsWithStats.filter(f => f.status === 'warning').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Farms with Warnings ({farmsWithStats.filter(f => f.status === 'warning').length})
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">These farms require monitoring and may need preventive action</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {farmsWithStats.filter(f => f.status === 'warning').slice(0, 8).map(farm => (
                    <div key={farm._id} className="p-4 border rounded-lg hover:bg-accent/50 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg border bg-card flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{farm.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {farm.location || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => fetchFarmDetails(farm._id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{farm.totalAnimals}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Animals</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-yellow-600">{farm.warningCount}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Warnings</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{farm.avgScore || '—'}%</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Health</p>
                        </div>
                      </div>

                      {farm.activeAlerts > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            <span>{farm.activeAlerts} active alert{farm.activeAlerts > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search farms by name or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || statusFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Farms Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                All Farms ({filteredFarms.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">Click any farm to view detailed animal information</p>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Farm</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Health Score</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Animals</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Critical</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Alerts</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredFarms.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-sm text-muted-foreground">
                          No farms found
                        </td>
                      </tr>
                    ) : (
                      filteredFarms.map((farm) => (
                        <tr key={farm._id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <button
                              onClick={() => fetchFarmDetails(farm._id)}
                              className="flex items-center gap-3 hover:underline text-left"
                            >
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{farm.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {farm.location || 'Unknown'}
                                </p>
                              </div>
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            {farm.avgScore !== null ? (
                              <Badge className={`${
                                farm.avgScore >= 80 ? 'bg-green-600' :
                                farm.avgScore >= 60 ? 'bg-blue-600' :
                                farm.avgScore >= 40 ? 'bg-yellow-600' :
                                'bg-red-600'
                              } text-white font-semibold px-3 py-1`}>
                                {farm.avgScore}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No data</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-semibold">{farm.totalAnimals}</span>
                              <span className="text-xs text-muted-foreground">{farm.monitoredCount} monitored</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {farm.criticalCount > 0 ? (
                              <Badge variant="destructive" className="font-semibold">{farm.criticalCount}</Badge>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {farm.activeAlerts > 0 ? (
                              <Badge variant="outline" className="border-yellow-600 text-yellow-600">{farm.activeAlerts}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant={
                              farm.status === 'healthy' ? 'default' :
                              farm.status === 'warning' ? 'outline' :
                              'destructive'
                            }>
                              {farm.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={actionLoading}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => fetchFarmDetails(farm._id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Animals
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedFarm(farm);
                                  setShowInspectionDialog(true);
                                }}>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Schedule Inspection
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedFarm(farm);
                                  setShowNotificationDialog(true);
                                }}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send Notification
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleFlagFarm(farm._id)}
                                  className="text-yellow-600"
                                >
                                  <Flag className="h-4 w-4 mr-2" />
                                  Flag for Review
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Inspections Tab */}
      {activeTab === 'inspections' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Scheduled Inspections</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">All scheduled farm inspections</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold uppercase">Date Created</th>
                    <th className="text-left p-4 text-xs font-semibold uppercase">Farm</th>
                    <th className="text-left p-4 text-xs font-semibold uppercase">Message</th>
                    <th className="text-center p-4 text-xs font-semibold uppercase">Priority</th>
                    <th className="text-center p-4 text-xs font-semibold uppercase">Status</th>
                    <th className="text-right p-4 text-xs font-semibold uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inspections.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-sm text-muted-foreground">
                        No inspections scheduled
                      </td>
                    </tr>
                  ) : (
                    inspections.map(inspection => {
                      const animal = animals.find(a => a._id === (inspection.animalId?._id || inspection.animalId));
                      const farmName = animal ? 
                        (typeof animal.farmId === 'object' ? animal.farmId?.name : 
                         farms.find(f => f._id === animal.farmId)?.name) : 'Unknown';
                      
                      return (
                        <tr key={inspection._id} className="hover:bg-muted/30">
                          <td className="p-4 text-sm">{new Date(inspection.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 text-sm font-medium">{farmName}</td>
                          <td className="p-4 text-sm">{inspection.message}</td>
                          <td className="p-4 text-center">
                            <Badge variant={
                              inspection.severity === 'high' ? 'destructive' :
                              inspection.severity === 'medium' ? 'outline' :
                              'secondary'
                            }>
                              {inspection.severity}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            {inspection.isResolved ? (
                              <Badge variant="default">Completed</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {!inspection.isResolved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResolveAlert(inspection._id)}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Sent Notifications</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">All notifications sent to farmers</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold uppercase">Date</th>
                    <th className="text-left p-4 text-xs font-semibold uppercase">Farm</th>
                    <th className="text-left p-4 text-xs font-semibold uppercase">Message</th>
                    <th className="text-center p-4 text-xs font-semibold uppercase">Priority</th>
                    <th className="text-center p-4 text-xs font-semibold uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {notifications.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-sm text-muted-foreground">
                        No notifications sent
                      </td>
                    </tr>
                  ) : (
                    notifications.map(notification => {
                      const animal = animals.find(a => a._id === (notification.animalId?._id || notification.animalId));
                      const farmName = animal ? 
                        (typeof animal.farmId === 'object' ? animal.farmId?.name : 
                         farms.find(f => f._id === animal.farmId)?.name) : 'Unknown';
                      
                      return (
                        <tr key={notification._id} className="hover:bg-muted/30">
                          <td className="p-4 text-sm">{new Date(notification.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 text-sm font-medium">{farmName}</td>
                          <td className="p-4 text-sm">{notification.message}</td>
                          <td className="p-4 text-center">
                            <Badge variant={
                              notification.severity === 'high' ? 'destructive' :
                              notification.severity === 'medium' ? 'outline' :
                              'secondary'
                            }>
                              {notification.severity}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            {notification.isResolved ? (
                              <Badge variant="default">Read</Badge>
                            ) : (
                              <Badge variant="secondary">Sent</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flagged Farms Tab */}
      {activeTab === 'flagged' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Flagged Farms</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Farms requiring administrative review</p>
          </CardHeader>
          <CardContent>
            {flaggedFarms.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-3" />
                <p className="text-sm text-muted-foreground">No farms flagged for review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {flaggedFarms.map(farm => {
                  const flagAlert = alerts.find(a => {
                    const farmAnimals = animals.filter(animal => {
                      const fId = typeof animal.farmId === 'object' ? animal.farmId?._id : animal.farmId;
                      return fId === farm._id;
                    });
                    const farmAnimalIds = farmAnimals.map(animal => animal._id);
                    return farmAnimalIds.includes(a.animalId?._id || a.animalId) && 
                           a.message?.toLowerCase().includes('flagged') &&
                           !a.isResolved;
                  });

                  return (
                    <div key={farm._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-foreground" />
                          <div>
                            <p className="font-semibold text-foreground">{farm.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {farm.totalAnimals} animals • {farm.criticalCount} critical • {farm.activeAlerts} alerts
                            </p>
                            {flagAlert && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                Flagged: {new Date(flagAlert.createdAt).toLocaleDateString()} - {flagAlert.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => fetchFarmDetails(farm._id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                        {flagAlert && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleResolveAlert(flagAlert._id)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Mark Reviewed
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Activity Log</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Recent admin actions and system events</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No activity to display</p>
                </div>
              ) : (
                alerts.slice(0, 20).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(activity => {
                  const animal = animals.find(a => a._id === (activity.animalId?._id || activity.animalId));
                  const farmName = animal ? 
                    (typeof animal.farmId === 'object' ? animal.farmId?.name : 
                     farms.find(f => f._id === animal.farmId)?.name) : 'Unknown';

                  return (
                    <div key={activity._id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'health' ? 'bg-blue-50 dark:bg-blue-950' :
                        activity.type === 'vaccination' ? 'bg-purple-50 dark:bg-purple-950' :
                        'bg-gray-50 dark:bg-gray-950'
                      }`}>
                        <Activity className={`h-4 w-4 ${
                          activity.type === 'health' ? 'text-blue-600' :
                          activity.type === 'vaccination' ? 'text-purple-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{farmName}</span>
                          {animal && (
                            <>
                              <span>•</span>
                              <span>{animal.name} ({animal.rfid})</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(activity.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge variant={activity.isResolved ? 'default' : 'secondary'}>
                        {activity.isResolved ? 'Resolved' : 'Active'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Farm Details Dialog */}
      <Dialog open={showFarmDialog} onOpenChange={setShowFarmDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {farmDetails?.farm?.name}
            </DialogTitle>
            <DialogDescription>Detailed animal health information</DialogDescription>
          </DialogHeader>

          {loadingFarm ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : farmDetails ? (
            <div className="space-y-6">
              
              {/* Farm Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold">{farmDetails.statistics?.totalAnimals}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Animals</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{farmDetails.statistics?.criticalCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Critical</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold">{farmDetails.statistics?.avgHealthScore || '—'}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Health</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-2xl font-bold">{farmDetails.statistics?.activeAlerts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active Alerts</p>
                </div>
              </div>

              {/* Animals Table */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Animals ({farmDetails.animals?.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Animal</th>
                        <th className="text-center p-3 text-xs font-semibold uppercase">Species</th>
                        <th className="text-center p-3 text-xs font-semibold uppercase">Age</th>
                        <th className="text-center p-3 text-xs font-semibold uppercase">Health Score</th>
                        <th className="text-center p-3 text-xs font-semibold uppercase">Alerts</th>
                        <th className="text-left p-3 text-xs font-semibold uppercase">Last Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {farmDetails.animals?.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-sm text-muted-foreground">
                            No animals in this farm
                          </td>
                        </tr>
                      ) : (
                        farmDetails.animals?.map(animal => (
                          <tr key={animal._id} className="hover:bg-muted/30">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{animal.name}</p>
                                <p className="text-xs text-muted-foreground">{animal.rfid}</p>
                              </div>
                            </td>
                            <td className="p-3 text-center capitalize">
                              <Badge variant="outline">{animal.species}</Badge>
                            </td>
                            <td className="p-3 text-center text-xs">
                              {animal.age} {animal.ageUnit}
                            </td>
                            <td className="p-3 text-center">
                              {animal.latestHealthScore !== null ? (
                                <Badge className={`${
                                  animal.latestHealthScore >= 80 ? 'bg-green-600' :
                                  animal.latestHealthScore >= 60 ? 'bg-blue-600' :
                                  animal.latestHealthScore >= 40 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                } text-white font-semibold`}>
                                  {animal.latestHealthScore}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">No data</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {animal.activeAlerts > 0 ? (
                                <Badge variant="destructive">{animal.activeAlerts}</Badge>
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              )}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {animal.lastCheckDate ? new Date(animal.lastCheckDate).toLocaleDateString() : 'Never'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Alerts */}
              {farmDetails.recentAlerts?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Active Alerts ({farmDetails.recentAlerts.length})
                  </h3>
                  <div className="space-y-2">
                    {farmDetails.recentAlerts.map(alert => (
                      <div key={alert._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.animalId?.name} ({alert.animalId?.rfid}) - {new Date(alert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveAlert(alert._id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Inspection Dialog */}
      <InspectionDialog
        open={showInspectionDialog}
        onClose={() => setShowInspectionDialog(false)}
        farm={selectedFarm}
        onSubmit={(data) => handleScheduleInspection(selectedFarm?._id, data)}
        loading={actionLoading}
      />

      {/* Notification Dialog */}
      <NotificationDialog
        open={showNotificationDialog}
        onClose={() => setShowNotificationDialog(false)}
        farm={selectedFarm}
        onSubmit={(message, priority) => handleSendNotification(selectedFarm?._id, message, priority)}
        loading={actionLoading}
      />
    </div>
  );
}

function InspectionDialog({ open, onClose, farm, onSubmit, loading }) {
  const [inspectionData, setInspectionData] = useState({
    date: '',
    type: 'health',
    assignedTo: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(inspectionData);
    setInspectionData({ date: '', type: 'health', assignedTo: '', notes: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
          <DialogDescription>Schedule an inspection for {farm?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={inspectionData.date}
              onChange={(e) => setInspectionData({ ...inspectionData, date: e.target.value })}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={inspectionData.type} onValueChange={(val) => setInspectionData({ ...inspectionData, type: val })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="health">Health Check</SelectItem>
                <SelectItem value="general">General Inspection</SelectItem>
                <SelectItem value="compliance">Compliance Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Assigned To</label>
            <Input
              type="text"
              value={inspectionData.assignedTo}
              onChange={(e) => setInspectionData({ ...inspectionData, assignedTo: e.target.value })}
              placeholder="Veterinarian name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={inspectionData.notes}
              onChange={(e) => setInspectionData({ ...inspectionData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
              Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NotificationDialog({ open, onClose, farm, onSubmit, loading }) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(message, priority);
    setMessage('');
    setPriority('medium');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
          <DialogDescription>Send a notification to {farm?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}