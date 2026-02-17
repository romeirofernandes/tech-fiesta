import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Syringe,
  Bell,
  LogOut,
  Moon,
  Sun,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  Globe,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Import admin sidebar components
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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
  AdminSidebarMenuSub,
  AdminSidebarMenuSubItem,
  AdminSidebarMenuSubButton,
  AdminSidebarFooter,
  AdminSidebarInset,
  AdminSidebarTrigger,
} from "@/components/admin/AdminSidebar";

// Import your tab components
import OverviewStats from "./components/OverviewStats";
import OperationalInsights from "./tabs/OperationalInsights";
import HealthAnalytics from "./tabs/HealthAnalytics";
import VaccinationTracking from "./tabs/VaccinationTracking";
import AlertsManagement from "./tabs/AlertsManagement";
import FarmerManagement from "./tabs/FarmerManagement";
import MarketPricesAdmin from "./tabs/MarketPricesAdmin";
import TransactionMonitor from "./tabs/TransactionMonitor";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { logout } = useUser();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Navigation items with proper routes
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard", breadcrumb: "Dashboard" },
    { id: "transactions", label: "Transactions", icon: IndianRupee, path: "/admin/transactions", breadcrumb: "Transactions" },
    { id: "farmers", label: "Farmers", icon: Users, path: "/admin/farmers", breadcrumb: "Farmer Management" },
    { 
      id: "health", 
      label: "Animals", 
      icon: HeartPulse, 
      breadcrumb: "Animal Health",
      subItems: [
        { id: "health-overview", label: "Farm Overview", path: "/admin/health/overview" },
        { id: "health-inspections", label: "Inspections", path: "/admin/health/inspections" },
        { id: "health-notifications", label: "Notifications", path: "/admin/health/notifications" },
        { id: "health-flagged", label: "Flagged Farms", path: "/admin/health/flagged" },
        { id: "health-activity", label: "Activity Log", path: "/admin/health/activity" },
      ]
    },
    { id: "vaccinations", label: "Vaccination Schedules", icon: Syringe, path: "/admin/vaccinations", breadcrumb: "Vaccinations" },
    { id: "alerts", label: "Alerts", icon: Bell, path: "/admin/alerts", breadcrumb: "System Alerts" },
    { id: "market-prices", label: "Market Prices", icon: TrendingUp, path: "/admin/market-prices", breadcrumb: "Market Prices" },
  ];

  const findCurrentNav = () => {
    const currentPath = location.pathname;
    
    for (const item of navItems) {
      if (item.path === currentPath) return item;
      if (item.subItems) {
        const sub = item.subItems.find(s => s.path === currentPath);
        if (sub) return { ...sub, breadcrumb: item.breadcrumb + " > " + sub.label };
      }
    }
    return navItems[0];
  };

  const currentNav = findCurrentNav();

  // Helper to check if a group is active
  const isGroupActive = (item) => {
    const currentPath = location.pathname;
    if (item.path === currentPath) return true;
    if (item.subItems) {
      return item.subItems.some(sub => sub.path === currentPath);
    }
    return false;
  };

  const isPathActive = (path) => {
    return location.pathname === path;
  };

  return (
    <AdminSidebarProvider defaultOpen={true}>
      {/* Admin Sidebar */}
      <AdminSidebar collapsible="icon">
        <AdminSidebarHeader>
          <div className="px-4 py-2 group-data-[collapsible=icon]:px-2">
            <h2 className="text-primary font-bold text-xl tracking-tight font-serif group-data-[collapsible=icon]:hidden">
              पशु पहचान
            </h2>
            <p className="text-xs text-muted-foreground mt-1 group-data-[collapsible=icon]:hidden">
              Admin Panel
            </p>
          </div>
        </AdminSidebarHeader>

        <AdminSidebarContent>
          <AdminSidebarGroup>
            <AdminSidebarGroupLabel>Main Menu</AdminSidebarGroupLabel>
            <AdminSidebarGroupContent>
              <AdminSidebarMenu>
                {navItems.map((item) => (
                  item.subItems ? (
                    <Collapsible 
                      key={item.id} 
                      asChild 
                      defaultOpen={isGroupActive(item)} 
                      className="group/collapsible"
                    >
                      <AdminSidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <AdminSidebarMenuButton
                            isActive={isGroupActive(item)}
                            className="cursor-pointer"
                          >
                            <item.icon />
                            <span>{item.label}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </AdminSidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <AdminSidebarMenuSub>
                            {item.subItems.map((sub) => (
                              <AdminSidebarMenuSubItem key={sub.id}>
                                <AdminSidebarMenuSubButton
                                  asChild
                                  isActive={isPathActive(sub.path)}
                                  onClick={() => navigate(sub.path)}
                                  className="cursor-pointer"
                                >
                                  <span>{sub.label}</span>
                                </AdminSidebarMenuSubButton>
                              </AdminSidebarMenuSubItem>
                            ))}
                          </AdminSidebarMenuSub>
                        </CollapsibleContent>
                      </AdminSidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <AdminSidebarMenuItem key={item.id}>
                      <AdminSidebarMenuButton
                        isActive={isPathActive(item.path)}
                        onClick={() => navigate(item.path)}
                        className="cursor-pointer"
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </AdminSidebarMenuButton>
                    </AdminSidebarMenuItem>
                  )
                ))}
              </AdminSidebarMenu>
            </AdminSidebarGroupContent>
          </AdminSidebarGroup>
        </AdminSidebarContent>

        <AdminSidebarFooter>
          <AdminSidebarMenu>
            <AdminSidebarMenuItem>
              <AdminSidebarMenuButton 
                onClick={toggleTheme}
                className="cursor-pointer"
              >
                {theme === "dark" ? <Sun /> : <Moon />}
                <span>Theme</span>
              </AdminSidebarMenuButton>
            </AdminSidebarMenuItem>

            <AdminSidebarMenuItem>
              <LanguageToggle>
                <AdminSidebarMenuButton className="w-full cursor-pointer">
                  <Globe />
                  <span>Language</span>
                </AdminSidebarMenuButton>
              </LanguageToggle>
            </AdminSidebarMenuItem>

            <AdminSidebarMenuItem>
              <AdminSidebarMenuButton 
                onClick={logout}
                className="text-destructive hover:text-destructive cursor-pointer"
              >
                <LogOut />
                <span>Logout</span>
              </AdminSidebarMenuButton>
            </AdminSidebarMenuItem>
          </AdminSidebarMenu>
        </AdminSidebarFooter>
      </AdminSidebar>

      {/* Main Content Area */}
      <AdminSidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <AdminSidebarTrigger />
          <div className="h-6 w-px bg-border" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  Admin
                </BreadcrumbLink>
              </BreadcrumbItem>
              {location.pathname !== "/admin/dashboard" && location.pathname !== "/admin" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentNav?.breadcrumb}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="w-full p-4 md:p-6 lg:p-8">
          {/* Nested Routes */}
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/dashboard" element={
              <div className="space-y-8">
                <OverviewStats />
                <OperationalInsights />
              </div>
            } />
            <Route path="/farmers" element={<FarmerManagement />} />
            <Route path="/transactions" element={<TransactionMonitor />} />
            <Route path="/health/overview" element={<HealthAnalytics view="overview" />} />
            <Route path="/health/inspections" element={<HealthAnalytics view="inspections" />} />
            <Route path="/health/notifications" element={<HealthAnalytics view="notifications" />} />
            <Route path="/health/flagged" element={<HealthAnalytics view="flagged" />} />
            <Route path="/health/activity" element={<HealthAnalytics view="activity" />} />
            <Route path="/vaccinations" element={<VaccinationTracking />} />
            <Route path="/alerts" element={<AlertsManagement />} />
            <Route path="/market-prices" element={<MarketPricesAdmin />} />
          </Routes>
        </div>
      </AdminSidebarInset>
    </AdminSidebarProvider>
  );
}