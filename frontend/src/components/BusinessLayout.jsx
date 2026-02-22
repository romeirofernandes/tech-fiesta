import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { BusinessSidebar } from "@/components/BusinessSidebar"
import { AppBreadcrumb } from "@/components/AppBreadcrumb"

export function BusinessLayout({ children, loading = false }) {
  return (
    <SidebarProvider>
      <BusinessSidebar />
      <main className="w-full min-h-screen bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border" />
            <AppBreadcrumb />
        </header>
        <div className="p-4 pt-0 relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                </div>
                <p className="mt-4 text-muted-foreground animate-pulse text-sm font-medium">Loading...</p>
              </div>
            ) : children}
        </div>
      </main>
    </SidebarProvider>
  )
}

export default BusinessLayout;
