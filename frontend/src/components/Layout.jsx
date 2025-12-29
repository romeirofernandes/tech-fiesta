import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { AppBreadcrumb } from "@/components/AppBreadcrumb"

export function Layout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full min-h-screen bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border" />
            <AppBreadcrumb />
        </header>
        <div className="p-4">
            {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
