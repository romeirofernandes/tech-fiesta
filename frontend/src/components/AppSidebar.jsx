import { Calendar, Home, Tractor, Beef, Syringe, LogOut, User, Activity, Moon, Sun, Globe, BarChart3, Bell, Sprout, Store, Package, Coins, ChevronRight, ChevronUp, TrendingUp, DollarSign, LineChart, AlertCircle, Radio, Video } from "lucide-react"
import { useUser } from "../context/UserContext"
import { useTheme } from "../context/ThemeContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { LanguageToggle } from "./LanguageToggle"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
    label: "My Farm",
    items: [
      { title: "Home", url: "/dashboard", icon: Home },
      {
        title: "Farms",
        url: "/farms",
        icon: Tractor,
        subItems: [
          { title: "My Farms", url: "/farms" },
          { title: "Add a Farm", url: "/farms/create" },
          { title: "Watch My Farm", url: "/farm-monitoring" },
          { title: "Farm Boundary", url: "/geofencing", icon: Radio },
          { title: "Herd Watch", url: "/herd-watch" },
        ],
      },
      {
        title: "Animals",
        url: "/animals",
        icon: Beef,
        subItems: [
          { title: "My Animals", url: "/animals" },
          { title: "Add an Animal", url: "/animals/create" },
        ],
      },
    ],
  },
  {
    label: "Health & Care",
    items: [
      { title: "Shot Schedule", url: "/calendar", icon: Calendar },
      { title: "Animal Health", url: "/live-vitals", icon: Activity },
      { title: "Warnings", url: "/alerts", icon: Bell },
      { title: "Emergency Help", url: "/emergency", icon: AlertCircle },
    ],
  },
  {
    label: "Selling & Money",
    items: [
      { title: "Mandi / Market", url: "/marketplace", icon: Store },
      { title: "My Orders", url: "/my-orders", icon: Package },
      { title: "My Sales", url: "/my-sales", icon: Coins },
      { title: "Govt. Help", url: "/schemes", icon: Sprout },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        title: "My Reports",
        url: "/bi",
        icon: BarChart3,
        subItems: [
          { title: "Overview", url: "/bi" },
          { title: "What I Produce", url: "/bi/production" },
          { title: "My Money", url: "/bi/finance" },
          { title: "Today's Prices", url: "/bi/prices" },
        ],
      },
      {
        title: "Video Report",
        url: "/video-summary",
        icon: Video,
      }
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full flex items-center justify-between py-6"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <User className="min-h-5 min-w-5 shrink-0" />
                    {state === "expanded" && (
                      <span className="truncate font-semibold">{user?.name || "My Account"}</span>
                    )}
                  </div>
                  {state === "expanded" && <ChevronUp className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg mb-2"
                side={state === "collapsed" ? "right" : "bottom"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center w-full cursor-pointer py-2 px-3">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer py-2 px-3">
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4 text-muted-foreground" /> : <Moon className="mr-2 h-4 w-4 text-muted-foreground" />}
                  <span>Change Look ({theme === 'dark' ? 'Light' : 'Dark'})</span>
                </DropdownMenuItem>
                
                <LanguageToggle>
                  <DropdownMenuItem className="cursor-pointer w-full py-2 px-3" onSelect={(e) => e.preventDefault()}>
                    <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Language</span>
                  </DropdownMenuItem>
                </LanguageToggle>
                
                <DropdownMenuSeparator className="my-1" />
                
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2 px-3">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="font-medium text-destructive">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
