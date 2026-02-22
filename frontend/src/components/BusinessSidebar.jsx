import { Home, Store, Package, Coins, BarChart3, TrendingUp, DollarSign, LineChart, LogOut, User, Moon, Sun, Globe, ChevronRight, ChevronUp, Tractor } from "lucide-react"
import { useUser } from "../context/UserContext"
import { useTheme } from "../context/ThemeContext"
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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

// Farmer's business mode nav (under /business/)
const farmerBusinessNavGroups = [
  {
    label: "Business",
    items: [
      { title: "Dashboard", url: "/business", icon: Home },
      { title: "Marketplace", url: "/business/marketplace", icon: Store },
      { title: "My Orders", url: "/business/orders", icon: Package },
      { title: "My Sales", url: "/business/sales", icon: Coins },
    ],
  },
  {
    label: "Reports & Analytics",
    items: [
      { title: "Overview", url: "/business/reports", icon: BarChart3 },
      { title: "Finance", url: "/business/reports/finance", icon: TrendingUp },
      { title: "Market Prices", url: "/business/reports/prices", icon: DollarSign },
    ],
  },
];

// Independent business owner nav (under /biz/)
const bizOwnerNavGroups = [
  {
    label: "Business",
    items: [
      { title: "Dashboard", url: "/biz/dashboard", icon: Home },
      { title: "Marketplace", url: "/biz/marketplace", icon: Store },
      { title: "My Orders", url: "/biz/orders", icon: Package },
      { title: "My Sales", url: "/biz/sales", icon: Coins },
    ],
  },
];

export function BusinessSidebar() {
  const { user, mongoUser, businessProfile, bizOwner, logout, bizLogout, setIsBusinessMode } = useUser();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect if we're in independent biz owner mode
  const isBizOwnerMode = location.pathname.startsWith('/biz/') || location.pathname === '/biz';
  const navGroups = isBizOwnerMode ? bizOwnerNavGroups : farmerBusinessNavGroups;

  const displayName = isBizOwnerMode
    ? (bizOwner?.tradeName || bizOwner?.fullName || 'Business')
    : (businessProfile?.tradeName || mongoUser?.fullName || 'पशु पहचान Business');

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
          <SidebarGroupLabel className="text-lg font-bold text-primary py-4 mb-2">
            {displayName}
          </SidebarGroupLabel>
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
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground outline-none ring-0"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage
                      src={isBizOwnerMode ? undefined : (mongoUser?.imageUrl || user?.photoURL)}
                      alt={displayName}
                    />
                    <AvatarFallback className="rounded-full">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  {state === "expanded" && (
                    <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {isBizOwnerMode ? 'Business Owner' : 'Business Mode'}
                      </span>
                    </div>
                  )}
                  {state === "expanded" && <ChevronUp className="ml-auto h-4 w-4 shrink-0" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg mb-2"
                side={state === "collapsed" ? "right" : "bottom"}
                align="end"
                sideOffset={4}
              >
                {!isBizOwnerMode && (
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center w-full cursor-pointer py-2 px-3">
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {!isBizOwnerMode && (
                  <DropdownMenuItem onClick={() => { setIsBusinessMode(false); navigate('/dashboard'); }} className="cursor-pointer py-2 px-3">
                    <Tractor className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Farmer Dashboard</span>
                  </DropdownMenuItem>
                )}

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

                <DropdownMenuItem
                  onClick={() => {
                    if (isBizOwnerMode) {
                      bizLogout();
                      navigate('/biz/login');
                    } else {
                      logout();
                    }
                  }}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2 px-3"
                >
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
