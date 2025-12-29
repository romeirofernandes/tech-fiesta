import { Calendar, Home, Inbox, Search, Settings, Activity, Syringe, AlertTriangle, LogOut } from "lucide-react"
import { useUser } from "../context/UserContext"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "./ui/button"

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
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Vaccination Schedules",
    url: "/vaccination-schedules",
    icon: Syringe,
  },
]

export function AppSidebar() {
  const { user, mongoUser, logout } = useUser();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>TAG TRACK</SidebarGroupLabel>
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
          <div className="p-2 flex flex-col gap-2">
             <div className="px-2 py-1.5 text-sm font-medium truncate">
                {mongoUser?.fullName || user?.phoneNumber || user?.email || "User"}
             </div>
             <div className="flex items-center justify-between px-2">
                <ThemeToggle />
                <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                    <LogOut className="h-4 w-4" />
                </Button>
             </div>
          </div>
      </SidebarFooter>
    </Sidebar>
  )
}
