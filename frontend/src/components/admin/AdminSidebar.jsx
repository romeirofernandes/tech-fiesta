"use client";
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const ADMIN_SIDEBAR_COOKIE_NAME = "admin_sidebar_state"
const ADMIN_SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const ADMIN_SIDEBAR_WIDTH = "16rem"
const ADMIN_SIDEBAR_WIDTH_MOBILE = "18rem"
const ADMIN_SIDEBAR_WIDTH_ICON = "3rem"
const ADMIN_SIDEBAR_KEYBOARD_SHORTCUT = "b"

const AdminSidebarContext = React.createContext(null)

function useAdminSidebar() {
  const context = React.useContext(AdminSidebarContext)
  if (!context) {
    throw new Error("useAdminSidebar must be used within an AdminSidebarProvider.")
  }

  return context
}

function AdminSidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback((value) => {
    const openState = typeof value === "function" ? value(open) : value
    if (setOpenProp) {
      setOpenProp(openState)
    } else {
      _setOpen(openState)
    }

    // This sets the cookie to keep the sidebar state.
    document.cookie = `${ADMIN_SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${ADMIN_SIDEBAR_COOKIE_MAX_AGE}`
  }, [setOpenProp, open])

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === ADMIN_SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo(() => ({
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
  }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar])

  return (
    <AdminSidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="admin-sidebar-wrapper"
          style={
            {
              "--admin-sidebar-width": ADMIN_SIDEBAR_WIDTH,
              "--admin-sidebar-width-icon": ADMIN_SIDEBAR_WIDTH_ICON,
              ...style
            }
          }
          className={cn(
            "group/admin-sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
            className
          )}
          {...props}>
          {children}
        </div>
      </TooltipProvider>
    </AdminSidebarContext.Provider>
  );
}

function AdminSidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useAdminSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="admin-sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--admin-sidebar-width) flex-col",
          className
        )}
        {...props}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="admin-sidebar"
          data-slot="admin-sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--admin-sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              "--admin-sidebar-width": ADMIN_SIDEBAR_WIDTH_MOBILE
            }
          }
          side={side}>
          <SheetHeader className="sr-only">
            <SheetTitle>Admin Sidebar</SheetTitle>
            <SheetDescription>Displays the admin mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="admin-sidebar">
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="admin-sidebar-gap"
        className={cn(
          "relative w-(--admin-sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--admin-sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--admin-sidebar-width-icon)"
        )} />
      <div
        data-slot="admin-sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--admin-sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--admin-sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--admin-sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--admin-sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--admin-sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...props}>
        <div
          data-sidebar="admin-sidebar"
          data-slot="admin-sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminSidebarTrigger({
  className,
  onClick,
  ...props
}) {
  const { toggleSidebar } = useAdminSidebar()

  return (
    <Button
      data-sidebar="admin-trigger"
      data-slot="admin-sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}>
      <PanelLeftIcon />
      <span className="sr-only">Toggle Admin Sidebar</span>
    </Button>
  );
}

function AdminSidebarRail({
  className,
  ...props
}) {
  const { toggleSidebar } = useAdminSidebar()

  return (
    <button
      data-sidebar="admin-rail"
      data-slot="admin-sidebar-rail"
      aria-label="Toggle Admin Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Admin Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props} />
  );
}

function AdminSidebarInset({
  className,
  ...props
}) {
  return (
    <main
      data-slot="admin-sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className
      )}
      {...props} />
  );
}

function AdminSidebarInput({
  className,
  ...props
}) {
  return (
    <Input
      data-slot="admin-sidebar-input"
      data-sidebar="admin-input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props} />
  );
}

function AdminSidebarHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="admin-sidebar-header"
      data-sidebar="admin-header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props} />
  );
}

function AdminSidebarFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="admin-sidebar-footer"
      data-sidebar="admin-footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props} />
  );
}

function AdminSidebarSeparator({
  className,
  ...props
}) {
  return (
    <Separator
      data-slot="admin-sidebar-separator"
      data-sidebar="admin-separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props} />
  );
}

function AdminSidebarContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="admin-sidebar-content"
      data-sidebar="admin-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props} />
  );
}

function AdminSidebarGroup({
  className,
  ...props
}) {
  return (
    <div
      data-slot="admin-sidebar-group"
      data-sidebar="admin-group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props} />
  );
}

function AdminSidebarGroupLabel({
  className,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="admin-sidebar-group-label"
      data-sidebar="admin-group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props} />
  );
}

function AdminSidebarGroupAction({
  className,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="admin-sidebar-group-action"
      data-sidebar="admin-group-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props} />
  );
}

function AdminSidebarGroupContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="admin-sidebar-group-content"
      data-sidebar="admin-group-content"
      className={cn("w-full text-sm", className)}
      {...props} />
  );
}

function AdminSidebarMenu({
  className,
  ...props
}) {
  return (
    <ul
      data-slot="admin-sidebar-menu"
      data-sidebar="admin-menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props} />
  );
}

function AdminSidebarMenuItem({
  className,
  ...props
}) {
  return (
    <li
      data-slot="admin-sidebar-menu-item"
      data-sidebar="admin-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props} />
  );
}

const adminSidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function AdminSidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : "button"
  const { isMobile, state } = useAdminSidebar()

  const button = (
    <Comp
      data-slot="admin-sidebar-menu-button"
      data-sidebar="admin-menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(adminSidebarMenuButtonVariants({ variant, size }), className)}
      {...props} />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip} />
    </Tooltip>
  );
}

function AdminSidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="admin-sidebar-menu-action"
      data-sidebar="admin-menu-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        className
      )}
      {...props} />
  );
}

function AdminSidebarMenuBadge({
  className,
  ...props
}) {
  return (
    <div
      data-slot="admin-sidebar-menu-badge"
      data-sidebar="admin-menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props} />
  );
}

function AdminSidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, [])

  return (
    <div
      data-slot="admin-sidebar-menu-skeleton"
      data-sidebar="admin-menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}>
      {showIcon && (
        <Skeleton className="size-4 rounded-md" data-sidebar="admin-menu-skeleton-icon" />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="admin-menu-skeleton-text"
        style={
          {
            "--skeleton-width": width
          }
        } />
    </div>
  );
}

function AdminSidebarMenuSub({
  className,
  ...props
}) {
  return (
    <ul
      data-slot="admin-sidebar-menu-sub"
      data-sidebar="admin-menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props} />
  );
}

function AdminSidebarMenuSubItem({
  className,
  ...props
}) {
  return (
    <li
      data-slot="admin-sidebar-menu-sub-item"
      data-sidebar="admin-menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props} />
  );
}

function AdminSidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      data-slot="admin-sidebar-menu-sub-button"
      data-sidebar="admin-menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props} />
  );
}

export {
  AdminSidebar,
  AdminSidebarContent,
  AdminSidebarFooter,
  AdminSidebarGroup,
  AdminSidebarGroupAction,
  AdminSidebarGroupContent,
  AdminSidebarGroupLabel,
  AdminSidebarHeader,
  AdminSidebarInput,
  AdminSidebarInset,
  AdminSidebarMenu,
  AdminSidebarMenuAction,
  AdminSidebarMenuBadge,
  AdminSidebarMenuButton,
  AdminSidebarMenuItem,
  AdminSidebarMenuSkeleton,
  AdminSidebarMenuSub,
  AdminSidebarMenuSubButton,
  AdminSidebarMenuSubItem,
  AdminSidebarProvider,
  AdminSidebarRail,
  AdminSidebarSeparator,
  AdminSidebarTrigger,
  useAdminSidebar,
}
