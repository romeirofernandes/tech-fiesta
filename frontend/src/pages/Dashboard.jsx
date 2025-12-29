import { Layout } from "@/components/Layout"

export default function Dashboard() {
  return (
    <Layout>
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
    </Layout>
  )
}
