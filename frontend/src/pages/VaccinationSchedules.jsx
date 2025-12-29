import React, { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function VaccinationSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/vacxx');
        if (response.ok) {
          const data = await response.json();
          setSchedules(data);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <div className="p-4 border-b">
            <SidebarTrigger />
        </div>
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6">Vaccination Schedules</h1>
            
            {loading ? (
                <p>Loading schedules...</p>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {schedules.map((schedule) => (
                        <Card key={schedule._id} className="h-full">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>{schedule.animalType}</span>
                                    {schedule.gender && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">{schedule.gender}</span>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {schedule.schedule.map((item, index) => (
                                        <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-sm">{item.disease}</span>
                                                {item.mandatory && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">Mandatory</span>}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                <p>First Dose: {item.firstDoseAtMonths} months</p>
                                                {item.boosterAfterMonths && <p>Booster: After {item.boosterAfterMonths} months</p>}
                                                {item.repeatEveryMonths && <p>Repeat: Every {item.repeatEveryMonths} months</p>}
                                                {item.notes && <p className="italic mt-1 text-xs">{item.notes}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
      </main>
    </SidebarProvider>
  );
}
