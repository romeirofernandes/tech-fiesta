import { Calendar, Home, Tractor, Beef, Syringe, LogOut, User, Activity } from "lucide-react"
import { useUser } from "../context/UserContext"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

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
  {
    title: "Vaccination Schedules",
    url: "/vaccination-schedules",
    icon: Syringe,
  },
  {
    title: "Live Vitals",
    url: "/live-vitals",
    icon: Activity,
  },
]

export function AppSidebar() {
  const { user, logout } = useUser();
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold text-primary py-4 mb-4">पशु पहचान</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
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
            <SidebarMenuButton asChild>
              <a href="/profile">
                <User />
                <span>Profile</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className={cn("flex items-center gap-2", state === "collapsed" ? "justify-center" : "px-2")}>
              <ThemeToggle />
              {state === "expanded" && <span className="text-sm text-muted-foreground">Theme</span>}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={logout}
            >
              <LogOut className={cn(state === "collapsed" ? "" : "mr-2")} />
              {state === "expanded" && <span>Logout</span>}
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
