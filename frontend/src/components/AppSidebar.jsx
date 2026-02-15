import { Calendar, Home, Tractor, Beef, Syringe, LogOut, User, Activity, Moon, Sun, Globe, BarChart3, Bell, Sprout, Store, Package, Coins, ScanFace, Video } from "lucide-react"
import { useUser } from "../context/UserContext"
import { useTheme } from "../context/ThemeContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocation, useNavigate } from "react-router-dom"
import { LanguageToggle } from "./LanguageToggle"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Farms",
    url: "/farms",
    icon: Tractor,
  },
  {
    title: "Animals",
    url: "/animals",
    icon: Beef,
  },
  // {
  //   title: "Animal ID",
  //   url: "/animal-identification",
  //   icon: ScanFace, 
  // },
  {
    title: "Farm Monitor",
    url: "/farm-monitoring",
    icon: Video,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Schemes",
    url: "/schemes",
    icon: Sprout,
  },
  {
    title: "Marketplace",
    url: "/marketplace",
    icon: Store,
  },
  {
    title: "My Orders",
    url: "/my-orders",
    icon: Package,
  },
  {
    title: "My Sales",
    url: "/my-sales",
    icon: Coins,
  },
  {
    title: "Alerts",
    url: "/alerts",
    icon: Bell,
  },
  {
    title: "BI & Analytics",
    url: "/bi",
    icon: BarChart3,
  },
  {
    title: "Live Vitals",
    url: "/live-vitals",
    icon: Activity,
  }
]

export function AppSidebar() {
  const { user, logout } = useUser();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (url) => {
    return location.pathname === url;
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold text-primary py-4 mb-4">पशु पहचान</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      state === "expanded" && isActive(item.url) && "bg-accent/50 border-l-4 border-primary pl-2"
                    )}
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profile")} className="w-full">
              <a href="/profile" className="flex items-center w-full">
                <User className={cn(state === "expanded" && "ml-2")} />
                {state === "expanded" && <span>Profile</span>}
              </a>
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
