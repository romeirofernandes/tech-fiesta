import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  Users, 
  HeartPulse, 
  Syringe, 
  Bell, 
  UserCircle, 
  LogOut,
  Settings,
  Palette
} from "lucide-react";

// Import your tab components
import OverviewStats from "./components/OverviewStats";
import OperationalInsights from "./tabs/OperationalInsights";
import HealthAnalytics from "./tabs/HealthAnalytics";
import VaccinationTracking from "./tabs/VaccinationTracking";
import AlertsManagement from "./tabs/AlertsManagement";
import FarmerManagement from "./tabs/FarmerManagement";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("insights");

  // Consistent navigation items matching your Sidebar structure
  const navItems = [
    { id: "insights", label: "Dashboard", icon: LayoutDashboard },
    { id: "farmers", label: "Farmers", icon: Users },
    { id: "health", label: "Animals", icon: HeartPulse },
    { id: "vaccinations", label: "Vaccination Schedules", icon: Syringe },
    { id: "alerts", label: "Alerts", icon: Bell },
  ];

  return (
    <div className="flex h-screen w-full bg-black text-zinc-100 overflow-hidden font-sans">
      
      {/* --- SIDEBAR: Matching your AppSidebar colors exactly --- */}
      <aside className="w-64 border-r border-zinc-800/50 flex flex-col flex-shrink-0 bg-[#0a0a0a]">
        <div className="p-6">
          <h2 className="text-[#22c55e] font-bold text-xl tracking-tight">पशु पहचान</h2>
        </div>

        {/* Sidebar Menu Group */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Main Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium group ${
                activeTab === item.id 
                  ? "bg-[#18181b] text-white" 
                  : "text-zinc-400 hover:text-white hover:bg-[#18181b]/50"
              }`}
            >
              <item.icon className={`h-4 w-4 ${activeTab === item.id ? "text-[#22c55e]" : "text-zinc-500 group-hover:text-zinc-300"}`} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer - Matching the Logout/Profile styling */}
        <div className="p-3 border-t border-zinc-900 space-y-1 bg-[#0a0a0a]">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-zinc-400 hover:text-white hover:bg-[#18181b] rounded-md transition-all text-sm">
            <UserCircle className="h-4 w-4 text-zinc-500" />
            Profile
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-zinc-400 hover:text-white hover:bg-[#18181b] rounded-md transition-all text-sm">
            <Palette className="h-4 w-4 text-zinc-500" />
            Theme
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-md transition-all text-sm mt-2">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 h-full overflow-y-auto bg-black">
        {/* We keep the Tabs logic purely for content switching to avoid layout errors */}
        <Tabs value={activeTab} className="w-full">
          <div className="p-8 max-w-[1600px] mx-auto w-full">
            
            <TabsContent value="insights" className="mt-0 outline-none space-y-8 border-none">
              <header className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Dashboard</h1>
                  <p className="text-zinc-500 text-sm mt-1">Operational Overview</p>
                </div>
              </header>
              <OverviewStats />
              <OperationalInsights />
            </TabsContent>

            <TabsContent value="farmers" className="mt-0 outline-none space-y-8 border-none">
              <header>
                 <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Farmer Management</h1>
                 <p className="text-zinc-500 text-sm mt-1">Manage registered farmers and their holdings</p>
              </header>
              <FarmerManagement />
            </TabsContent>

            <TabsContent value="health" className="mt-0 outline-none space-y-8 border-none">
              <header>
                 <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Animal Health Analytics</h1>
              </header>
              <HealthAnalytics />
            </TabsContent>

            <TabsContent value="vaccinations" className="mt-0 outline-none space-y-8 border-none">
              <header>
                 <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Vaccination Tracking</h1>
              </header>
              <VaccinationTracking />
            </TabsContent>

            <TabsContent value="alerts" className="mt-0 outline-none space-y-8 border-none">
              <header>
                 <h1 className="text-3xl font-bold tracking-tight text-white font-serif">System Alerts</h1>
              </header>
              <AlertsManagement />
            </TabsContent>

          </div>
        </Tabs>
      </main>
    </div>
  );
}