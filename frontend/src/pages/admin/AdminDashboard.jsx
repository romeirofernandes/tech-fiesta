import { useState } from "react";
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
  AdminSidebarSeparator,
  AdminSidebarTrigger,
  useAdminSidebar,
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
  const [activeTab, setActiveTab] = useState("insights");
  const { theme, setTheme } = useTheme();
  const { user, logout } = useUser();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Navigation items matching your sidebar structure
  const navItems = [
    { id: "insights", label: "Dashboard", icon: LayoutDashboard, breadcrumb: "Dashboard" },
    { id: "transactions", label: "Transactions", icon: IndianRupee, breadcrumb: "Transactions" },
    { id: "farmers", label: "Farmers", icon: Users, breadcrumb: "Farmer Management" },
    { 
      id: "health", 
      label: "Animals", 
      icon: HeartPulse, 
      breadcrumb: "Animal Health",
      subItems: [
        { id: "health-overview", label: "Farm Overview" },
        { id: "health-inspections", label: "Inspections" },
        { id: "health-notifications", label: "Notifications" },
        { id: "health-flagged", label: "Flagged Farms" },
        { id: "health-activity", label: "Activity Log" },
      ]
    },
    { id: "vaccinations", label: "Vaccination Schedules", icon: Syringe, breadcrumb: "Vaccinations" },
    { id: "alerts", label: "Alerts", icon: Bell, breadcrumb: "System Alerts" },
    { id: "market-prices", label: "Market Prices", icon: TrendingUp, breadcrumb: "Market Prices" },
  ];

  const findCurrentNav = () => {
    for (const item of navItems) {
      if (item.id === activeTab) return item;
      if (item.subItems) {
        const sub = item.subItems.find(s => s.id === activeTab);
        if (sub) return { ...sub, breadcrumb: item.breadcrumb + " > " + sub.label };
      }
    }
    return navItems[0];
  };

  const currentNav = findCurrentNav();

  // Helper to check if a group is active (for defaultOpen)
  const isGroupActive = (item) => {
    if (item.id === activeTab) return true;
    if (item.subItems) {
      return item.subItems.some(sub => sub.id === activeTab);
    }
    return false;
  };

  // Render content based on active tab
  const renderContent = () => {
    // Handle health sub-tabs (removed the prefix 'health-' to pass as view prop)
    if (activeTab.startsWith("health-")) {
      return <HealthAnalytics view={activeTab.replace("health-", "")} />;
    }
    // Handle main health tab defaulting to overview
    if (activeTab === "health") {
       return <HealthAnalytics view="overview" />;
    }

    switch (activeTab) {
      case "insights":
        return (
          <div className="space-y-8">
            <OverviewStats />
            <OperationalInsights />
          </div>
        );
      case "farmers":
        return <FarmerManagement />;
      case "vaccinations":
        return <VaccinationTracking />;
      case "alerts":
        return <AlertsManagement />;
      case "transactions":
        return <TransactionMonitor />;
      case "market-prices":
        return <MarketPricesAdmin />;
      default:
        return null;
    }
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
              <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
                
              </div>
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
                              onClick={() => {
                                // Optional: if clicking parent toggles, or sets defaults. 
                                // Here let's just let Collapsible handle expand/collapse
                                // But if we want clicking "Animals" to go to default view:
                                // setActiveTab(item.id); 
                              }}
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
                                    isActive={activeTab === sub.id}
                                    onClick={() => setActiveTab(sub.id)}
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
                          isActive={activeTab === item.id}
                          onClick={() => setActiveTab(item.id)}
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
              {/* <AdminSidebarMenuItem>
                <AdminSidebarMenuButton className="cursor-pointer">
                  <UserCircle />
                  <span>Profile</span>
                </AdminSidebarMenuButton>
              </AdminSidebarMenuItem> */}
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
                      onClick={() => setActiveTab("insights")}
                    >
                      Admin
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {activeTab !== "insights" && (
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
            {/* Content */}
            {renderContent()}
          </div>
        </AdminSidebarInset>

    </AdminSidebarProvider>
  );
}