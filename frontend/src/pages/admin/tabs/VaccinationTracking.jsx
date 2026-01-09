import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search, 
  Syringe, 
  ShieldCheck, 
  History,
  Filter
} from "lucide-react";
import axios from "axios";

export default function VaccinationTracking() {
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVaccinations();
  }, []);

  const fetchVaccinations = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/vaccination-events`);
      setVaccinations(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-zinc-500">Syncing vaccination records...</div>;

  // --- START OF YOUR ORIGINAL LOGIC ---
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const upcomingVaccinations = vaccinations.filter(v => {
    const date = new Date(v.date);
    return date > today && date <= nextWeek && v.eventType === 'scheduled';
  });

  const overdueVaccinations = vaccinations.filter(v => {
    const date = new Date(v.date);
    return date < today && v.eventType === 'scheduled';
  });

  const completedRecently = vaccinations.filter(v => {
    const date = new Date(v.date);
    return date > lastMonth && date <= today && v.eventType === 'completed';
  });

  const vaccineTypes = vaccinations.reduce((acc, v) => {
    if (!acc[v.vaccineName]) {
      acc[v.vaccineName] = { scheduled: 0, completed: 0, overdue: 0 };
    }
    const date = new Date(v.date);
    if (v.eventType === 'completed') {
      acc[v.vaccineName].completed++;
    } else if (date < today) {
      acc[v.vaccineName].overdue++;
    } else {
      acc[v.vaccineName].scheduled++;
    }
    return acc;
  }, {});

  const complianceRate = vaccinations.length > 0 
    ? Math.round((completedRecently.length / (completedRecently.length + overdueVaccinations.length)) * 100)
    : 0;
  // --- END OF YOUR ORIGINAL LOGIC ---

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 font-sans">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "DUE THIS WEEK", val: upcomingVaccinations.length, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "OVERDUE", val: overdueVaccinations.length, icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "COMPLETED (30D)", val: completedRecently.length, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "COMPLIANCE", val: `${complianceRate}%`, icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((item, i) => (
          <div key={i} className="bg-black border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
            <div className={`${item.bg} p-3 rounded-lg`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-black">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Upcoming Schedule
              </h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input placeholder="Filter events..." className="bg-black border border-zinc-800 text-xs rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 w-40" />
                </div>
                <button className="bg-black border border-zinc-800 p-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                  <Filter className="h-3.5 w-3.5 text-zinc-400" />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800 bg-zinc-900/50 font-bold text-[10px] uppercase">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Vaccine</th>
                    <th className="px-6 py-3">Animal / ID</th>
                    <th className="px-6 py-3 text-right">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {upcomingVaccinations.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 italic">No scheduled events for the coming week</td>
                    </tr>
                  ) : (
                    upcomingVaccinations.map((v) => (
                      <tr key={v._id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-zinc-400 text-xs">
                          {new Date(v.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 font-medium text-zinc-200">{v.vaccineName}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-zinc-300">{v.animalId?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-zinc-600 font-mono">{v.animalId?.rfid}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Badge variant="outline" className="border-zinc-700 text-zinc-500 font-normal text-[10px] uppercase tracking-tighter">
                            {v.repeatsEvery || 'One-time'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {overdueVaccinations.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-200">{overdueVaccinations.length} Overdue Records</p>
                  <p className="text-xs text-red-200/60 leading-relaxed mt-1">
                    Herd health compliance is currently at risk. Immediate action required.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card className="bg-black border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                <Syringe className="h-3.5 w-3.5" />
                Coverage by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(vaccineTypes).map(([vaccine, stats]) => {
                const total = stats.scheduled + stats.completed + stats.overdue;
                const rate = total > 0 ? Math.round((stats.completed / total) * 100) : 0;
                
                return (
                  <div key={vaccine}>
                    <div className="flex justify-between text-[11px] mb-1.5 font-medium">
                      <span className="text-zinc-300">{vaccine}</span>
                      <span className={rate > 80 ? "text-green-500" : "text-yellow-500"}>{rate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${rate > 80 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                        style={{ width: `${rate}%` }} 
                      />
                    </div>
                    <div className="flex gap-3 mt-2 text-[9px] text-zinc-600 uppercase tracking-tighter font-bold">
                      <span>Done: {stats.completed}</span>
                      <span>Due: {stats.scheduled}</span>
                      <span className={stats.overdue > 0 ? "text-red-500" : ""}>Overdue: {stats.overdue}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="bg-black border border-zinc-800 rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-zinc-600 transition-all">
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-zinc-500" />
              <span className="text-xs text-zinc-400 group-hover:text-zinc-200">History Log</span>
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}