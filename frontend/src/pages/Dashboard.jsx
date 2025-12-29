import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useUser } from "../context/UserContext"

export default function Dashboard() {
  const { user, mongoUser } = useUser();

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <div className="p-4 flex justify-between items-center border-b">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
                <span>Welcome, {mongoUser?.fullName || user?.phoneNumber || user?.email}</span>
                <ThemeToggle />
            </div>
        </div>
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Placeholder cards */}
                <div className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
                    <h3 className="font-semibold">Total Animals</h3>
                    <p className="text-2xl font-bold">124</p>
                </div>
                <div className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
                    <h3 className="font-semibold">Health Alerts</h3>
                    <p className="text-2xl font-bold text-red-500">3</p>
                </div>
                <div className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
                    <h3 className="font-semibold">Vaccinations Due</h3>
                    <p className="text-2xl font-bold text-yellow-500">12</p>
                </div>
                <div className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
                    <h3 className="font-semibold">Active Sensors</h3>
                    <p className="text-2xl font-bold text-green-500">120</p>
                </div>
            </div>
        </div>
      </main>
    </SidebarProvider>
  )
}
