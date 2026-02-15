import { Calendar, Home, Tractor, Beef, Syringe, LogOut, User, Activity, Moon, Sun, Globe, BarChart3, Bell, Sprout, Store, Package, Coins, ChevronRight, TrendingUp, DollarSign, LineChart } from "lucide-react"
import { useUser } from "../context/UserContext"
import { useTheme } from "../context/ThemeContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { LanguageToggle } from "./LanguageToggle"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"

// Grouped navigation items with collapsible sub-items
const navGroups = [
  {
    label: "Management",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      {
        title: "Farms",
        url: "/farms",
        icon: Tractor,
        subItems: [
          { title: "All Farms", url: "/farms" },
          { title: "Create Farm", url: "/farms/create" },
          { title: "Farm Monitor", url: "/farm-monitoring", }
        ],
      },
      {
        title: "Animals",
        url: "/animals",
        icon: Beef,
        subItems: [
          { title: "All Animals", url: "/animals" },
          { title: "Create Animal", url: "/animals/create" },
        ],
      },
    ],
  },
  {
    label: "Health & Monitoring",
    items: [
      { title: "Vaccination Calendar", url: "/calendar", icon: Calendar },
      { title: "Live Vitals", url: "/live-vitals", icon: Activity },
      { title: "Alerts", url: "/alerts", icon: Bell },
    ],
  },
  {
    label: "Market & Finance",
    items: [
      { title: "Marketplace", url: "/marketplace", icon: Store },
      { title: "My Orders", url: "/my-orders", icon: Package },
      { title: "My Sales", url: "/my-sales", icon: Coins },
      { title: "Schemes", url: "/schemes", icon: Sprout },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        title: "BI & Analytics",
        url: "/bi",
        icon: BarChart3,
        subItems: [
          { title: "Overview", url: "/bi" },
          { title: "Production", url: "/bi/production" },
          { title: "Finance", url: "/bi/finance" },
          { title: "Market Prices", url: "/bi/prices" },
        ],
      },
    ],
  },
];

export function AppSidebar() {
  const { user, logout } = useUser();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (url, hasChildren = false) => {
    if (location.pathname === url) return true;
    if (hasChildren) return location.pathname.startsWith(url + '/');
    return false;
  };

  const isGroupOpen = (item) => {
    if (isActive(item.url, true)) return true;
    if (item.subItems) {
      return item.subItems.some(sub => location.pathname === sub.url);
    }
    return false;
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sidebar collapsible="icon" className="[&_[data-sidebar=sidebar]]:scrollbar-thin [&_[data-sidebar=sidebar]]:scrollbar-track-transparent [&_[data-sidebar=sidebar]]:scrollbar-thumb-border/40 hover:[&_[data-sidebar=sidebar]]:scrollbar-thumb-border/60 [&_[data-sidebar=sidebar]]:scrollbar-thumb-rounded-full">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold text-primary py-4 mb-2">पशु पहचान</SidebarGroupLabel>
        </SidebarGroup>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) =>
                  item.subItems ? (
                    <Collapsible key={item.title} asChild defaultOpen={isGroupOpen(item)} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive(item.url, true)}
                            className={cn(
                              "cursor-pointer",
                              state === "expanded" && isActive(item.url, true) && "bg-accent/50 border-l-4 border-primary pl-2"
                            )}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((sub) => (
                              <SidebarMenuSubItem key={sub.url}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === sub.url}
                                >
                                  <Link to={sub.url}>{sub.title}</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url, true)}
                        className={cn(
                          state === "expanded" && isActive(item.url, true) && "bg-accent/50 border-l-4 border-primary pl-2"
                        )}
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profile")} className={cn("w-full", state === "expanded" && isActive("/profile") && "bg-accent/50 border-l-4 border-primary pl-2")}>
              <Link to="/profile" className="flex items-center w-full">
                <User className={cn(state === "expanded" && "ml-2")} />
                {state === "expanded" && <span>Profile</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="w-full">
              <button
                onClick={toggleTheme}
                className="flex items-center w-full cursor-pointer"
              >
                {theme === "dark" ? (
                  <Moon className={cn("h-[1.2rem] w-[1.2rem]", state === "expanded" && "ml-2")} />
                ) : (
                  <Sun className={cn("h-[1.2rem] w-[1.2rem]", state === "expanded" && "ml-2")} />
                )}
                {state === "expanded" && <span>Theme</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <LanguageToggle>
              <SidebarMenuButton className="w-full">
                <Globe className={cn("h-[1.2rem] w-[1.2rem]", state === "expanded" && "ml-2")} />
                {state === "expanded" && <span>Language</span>}
              </SidebarMenuButton>
            </LanguageToggle>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="w-full">
              <button
                onClick={logout}
                className="flex items-center w-full mb-4 cursor-pointer text-destructive hover:text-destructive/90"
              >
                <LogOut className={cn(state === "expanded" && "ml-2")} />
                {state === "expanded" && <span>Logout</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
