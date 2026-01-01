import { Calendar, Home, Inbox, Search, Settings, Activity, Syringe, AlertTriangle, LogOut, User } from "lucide-react"
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
    title: "Vaccination Schedules",
    url: "/vaccination-schedules",
    icon: Syringe,
  },
]

export function AppSidebar() {
  const { user, mongoUser, logout } = useUser();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
          <div className={cn("p-2 flex flex-col gap-2", isCollapsed ? "items-center" : "")}>
             <a 
               href="/profile" 
               className={cn(
                 "flex items-center gap-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                 isCollapsed ? "justify-center p-2" : "px-3 py-2 border bg-card mb-1"
               )}
               title="View Profile"
             >
               <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                 <User className="h-4 w-4" />
               </div>
               
               {!isCollapsed && (
                 <div className="flex flex-col truncate text-left overflow-hidden">
                   <span className="truncate font-semibold text-sm">{mongoUser?.fullName || "Farmer"}</span>
                   <span className="text-xs text-muted-foreground truncate">Profile</span>
                 </div>
               )}
             </a>

             <div className={cn("flex flex-col gap-2", isCollapsed ? "items-center w-full" : "w-full")}>
                {isCollapsed ? (
                    <>
                        <ThemeToggle />
                        <Button variant="destructive" size="icon" onClick={logout} title="Logout">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="w-full">
                            <ThemeToggle className="w-full justify-start" />
                        </div>
                        <Button 
                            variant="destructive" 
                            className="w-full justify-start gap-2" 
                            onClick={logout} 
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </Button>
                    </>
                )}
             </div>
          </div>
      </SidebarFooter>
    </Sidebar>
  )
}
