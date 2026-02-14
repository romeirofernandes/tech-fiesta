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
  Moon,
  Sun,
  IndianRupee
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

// Import admin sidebar components
import {
  AdminSidebarProvider,
  AdminSidebar,
  AdminSidebarHeader,
  AdminSidebarContent,
  AdminSidebarGroup,
  AdminSidebarGroupLabel,
  AdminSidebarGroupContent,
  AdminSidebarMenu,
  AdminSidebarMenuItem,
  AdminSidebarMenuButton,
  AdminSidebarFooter,
  AdminSidebarInset,
  AdminSidebarSeparator,
} from "@/components/admin/AdminSidebar";

// Import your tab components
import OverviewStats from "./components/OverviewStats";
import OperationalInsights from "./tabs/OperationalInsights";
import HealthAnalytics from "./tabs/HealthAnalytics";
import VaccinationTracking from "./tabs/VaccinationTracking";
import AlertsManagement from "./tabs/AlertsManagement";
import FarmerManagement from "./tabs/FarmerManagement";
import MarketPricesAdmin from "./tabs/MarketPricesAdmin";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("insights");
  const { theme, setTheme } = useTheme();

  // Consistent navigation items matching your Sidebar structure
  const navItems = [
    { id: "insights", label: "Dashboard", icon: LayoutDashboard },
    { id: "farmers", label: "Farmers", icon: Users },
    { id: "health", label: "Animals", icon: HeartPulse },
    { id: "vaccinations", label: "Vaccination Schedules", icon: Syringe },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "market-prices", label: "Market Prices", icon: IndianRupee },
  ];

  return (
    <AdminSidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        
        {/* Admin Sidebar */}
        <AdminSidebar>
          <AdminSidebarHeader>
            <div className="px-4 py-2">
              <h2 className="text-primary font-bold text-xl tracking-tight font-serif">पशु पहचान</h2>
            </div>
          </AdminSidebarHeader>

          <AdminSidebarContent>
            <AdminSidebarGroup>
              <AdminSidebarGroupLabel>Main Menu</AdminSidebarGroupLabel>
              <AdminSidebarGroupContent>
                <AdminSidebarMenu>
                  {navItems.map((item) => (
                    <AdminSidebarMenuItem key={item.id}>
                      <AdminSidebarMenuButton
                        isActive={activeTab === item.id}
                        onClick={() => setActiveTab(item.id)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </AdminSidebarMenuButton>
                    </AdminSidebarMenuItem>
                  ))}
                </AdminSidebarMenu>
              </AdminSidebarGroupContent>
            </AdminSidebarGroup>
          </AdminSidebarContent>

          <AdminSidebarFooter>
            <AdminSidebarMenu>
              <AdminSidebarMenuItem>
                <AdminSidebarMenuButton>
                  <UserCircle />
                  <span>Profile</span>
                </AdminSidebarMenuButton>
              </AdminSidebarMenuItem>
              <AdminSidebarMenuItem>
                <AdminSidebarMenuButton onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun /> : <Moon />}
                  <span>Theme</span>
                </AdminSidebarMenuButton>
              </AdminSidebarMenuItem>
            </AdminSidebarMenu>
            <AdminSidebarSeparator />
            <AdminSidebarMenu>
              <AdminSidebarMenuItem>
                <AdminSidebarMenuButton className="text-destructive hover:text-destructive">
                  <LogOut />
                  <span>Logout</span>
                </AdminSidebarMenuButton>
              </AdminSidebarMenuItem>
            </AdminSidebarMenu>
          </AdminSidebarFooter>
        </AdminSidebar>

        {/* Main Content Area */}
        <AdminSidebarInset>
          <div className="flex-1 h-full overflow-y-auto">
            <Tabs value={activeTab} className="w-full">
              <div className="p-8 max-w-400 mx-auto w-full">
                
                <TabsContent value="insights" className="mt-0 outline-none space-y-8 border-none">
                  <header className="flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Dashboard</h1>
                      <p className="text-muted-foreground text-sm mt-1">Operational Overview</p>
                    </div>
                  </header>
                  <OverviewStats />
                  <OperationalInsights />
                </TabsContent>

                <TabsContent value="farmers" className="mt-0 outline-none space-y-8 border-none">
                  <header>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Farmer Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage registered farmers and their holdings</p>
                  </header>
                  <FarmerManagement />
                </TabsContent>

                <TabsContent value="health" className="mt-0 outline-none space-y-8 border-none">
                  <header>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Animal Health Analytics</h1>
                  </header>
                  <HealthAnalytics />
                </TabsContent>

                <TabsContent value="vaccinations" className="mt-0 outline-none space-y-8 border-none">
                  <header>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Vaccination Tracking</h1>
                  </header>
                  <VaccinationTracking />
                </TabsContent>

                <TabsContent value="alerts" className="mt-0 outline-none space-y-8 border-none">
                  <header>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">System Alerts</h1>
                  </header>
                  <AlertsManagement />
                </TabsContent>

                <TabsContent value="market-prices" className="mt-0 outline-none space-y-8 border-none">
                  <header>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Market Prices</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage India commodity prices (AGMARKNET + manual)</p>
                  </header>
                  <MarketPricesAdmin />
                </TabsContent>

              </div>
            </Tabs>
          </div>
        </AdminSidebarInset>
      </div>
    </AdminSidebarProvider>
  );
}