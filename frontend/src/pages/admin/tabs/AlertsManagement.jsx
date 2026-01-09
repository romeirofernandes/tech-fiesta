import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Filter,
  Activity,
  Search,
  History,
  MoreVertical
} from "lucide-react";
import axios from "axios";

export default function AlertsManagement() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/alerts`);
      setAlerts(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/alerts/${alertId}/resolve`);
      fetchAlerts(); 
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground font-medium tracking-tight">Accessing alert logs...</div>;

  // --- START OF YOUR ORIGINAL LOGIC ---
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return !alert.isResolved;
    if (filter === 'resolved') return alert.isResolved;
    return true;
  });

  const activeAlerts = alerts.filter(a => !a.isResolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'high');
  const todayAlerts = alerts.filter(a => {
    const alertDate = new Date(a.createdAt);
    const today = new Date();
    return alertDate.toDateString() === today.toDateString();
  });

  const resolvedAlerts = alerts.filter(a => a.isResolved && a.resolvedAt);
  const avgResolutionTime = resolvedAlerts.length > 0
    ? resolvedAlerts.reduce((sum, alert) => {
        const created = new Date(alert.createdAt);
        const resolved = new Date(alert.resolvedAt);
        return sum + (resolved - created) / (1000 * 60 * 60);
      }, 0) / resolvedAlerts.length
    : 0;

  const alertsByType = activeAlerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {});

  const priorityAlerts = criticalAlerts.slice(0, 5);
  // --- END OF YOUR ORIGINAL LOGIC ---

  return (
    <div className="space-y-6">
      
      {/* Top Metric Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "ACTIVE ALERTS", val: activeAlerts.length, icon: Bell, color: "text-chart-2", bg: "bg-chart-2/10", sub: `${todayAlerts.length} new today` },
          { label: "CRITICAL", val: criticalAlerts.length, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", sub: "Immediate action" },
          { label: "RESOLUTION RATE", val: `${alerts.length > 0 ? Math.round((resolvedAlerts.length / alerts.length) * 100) : 0}%`, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", sub: `${resolvedAlerts.length} total resolved` },
          { label: "AVG RESPONSE", val: `${avgResolutionTime.toFixed(1)}h`, icon: Clock, color: "text-muted-foreground", bg: "bg-muted", sub: "Resolution time" },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className={`${item.bg} p-3 rounded-lg`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground">{item.val}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{item.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Alert Feed Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Alerts</h3>
                <div className="flex bg-background border border-border rounded-md p-1">
                  {['all', 'active', 'resolved'].map((t) => (
                    <button 
                      key={t}
                      onClick={() => setFilter(t)}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${filter === t ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input placeholder="Search logs..." className="bg-background border border-border text-xs text-foreground rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring w-48" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border bg-muted font-bold text-[10px] uppercase">
                    <th className="px-6 py-3">Timestamp / Animal</th>
                    <th className="px-6 py-3">Type & Message</th>
                    <th className="px-6 py-3">Severity</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-muted-foreground text-xs italic font-medium">No alerts matching current filter</td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert._id} className={`group hover:bg-accent transition-colors ${!alert.isResolved ? 'bg-destructive/[0.02]' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground font-mono text-[11px] mb-1">
                              {new Date(alert.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-foreground font-medium text-xs">{alert.animalId?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">{alert.type}</span>
                            <span className="text-muted-foreground text-xs line-clamp-1">{alert.message}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`text-[9px] uppercase font-bold border-none px-2 py-0.5 rounded-sm ${
                            alert.severity === 'high' ? 'bg-destructive/10 text-destructive' : 
                            alert.severity === 'medium' ? 'bg-chart-5/10 text-chart-5' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {alert.severity}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {alert.isResolved ? (
                            <Badge variant="outline" className="border-primary/20 text-primary text-[10px] bg-primary/5">Resolved</Badge>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => resolveAlert(alert._id)}
                              className="h-8 text-[10px] uppercase font-bold"
                            >
                              Resolve
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Distribution Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-6 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" />
              Active Distribution
            </h3>
            <div className="space-y-6">
              {Object.entries(alertsByType).map(([type, count]) => {
                const percentage = activeAlerts.length > 0 ? Math.round((count / activeAlerts.length) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-[11px] mb-1.5 font-bold uppercase tracking-tight">
                      <span className="text-muted-foreground">{type}</span>
                      <span className="text-foreground">{percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border">
                      <div 
                        className="h-full bg-chart-2 rounded-full transition-all duration-700" 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(alertsByType).length === 0 && (
                <p className="text-center text-zinc-600 text-[10px] uppercase font-bold py-4">No active alerts recorded</p>
              )}
            </div>
          </div>

          {/* Performance Analytics */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-4">Response Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-[9px] text-muted-foreground font-bold uppercase">Fastest</p>
                <p className="text-lg font-semibold text-primary">
                  {resolvedAlerts.length > 0 
                    ? Math.min(...resolvedAlerts.map(a => {
                        const created = new Date(a.createdAt);
                        const resolved = new Date(a.resolvedAt);
                        return (resolved - created) / (1000 * 60 * 60);
                      })).toFixed(1) + 'h'
                    : '—'}
                </p>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-[9px] text-muted-foreground font-bold uppercase">Today</p>
                <p className="text-lg font-semibold text-foreground">
                   {resolvedAlerts.filter(a => {
                    const resolved = new Date(a.resolvedAt);
                    const today = new Date();
                    return resolved.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
            </div>
          </div>

          {/* History shortcut */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-border/80 transition-all">
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-tighter group-hover:text-foreground">Archive & Logs</span>
            </div>
            <MoreVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

      </div>
    </div>
  );
}