import { Layout } from "@/components/Layout"
import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion";
import { Calendar, Info, AlertCircle } from "lucide-react";
import Loading from '@/components/ui/Loading';
export default function VacxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        // Assuming the API supports getting a single schedule by ID
        // If not, we might need to fetch all and filter, but let's assume standard REST
        const response = await fetch(`http://localhost:8000/api/vacxx/${id}`);
        if (response.ok) {
          const data = await response.json();
          setSchedule(data);
        } else {
            // Fallback if single fetch isn't implemented, fetch all and find
            const allResponse = await fetch('http://localhost:8000/api/vacxx');
            if (allResponse.ok) {
                const allData = await allResponse.json();
                const found = allData.find(s => s._id === id);
                if (found) setSchedule(found);
            }
        }
      } catch (error) {
        console.error('Error fetching schedule details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [id]);

  if (loading) return <Loading />;

  if (!schedule) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h2 className="text-2xl font-bold mb-4">Schedule not found</h2>
            <Button onClick={() => navigate('/vaccination-schedules')}>Back to Schedules</Button>
        </div>
    );
  }

  return (
    <Layout>
        <div className="max-w-5xl mx-auto">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <div className="relative h-64 md:h-80 w-full rounded-xl overflow-hidden mb-6 shadow-xl">
                    <img 
                        src={schedule.image || '/placeholder/cow.png'} 
                        alt={schedule.animalType} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder/cow.png'; }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-white">
                        <h1 className="text-4xl font-bold mb-2">{schedule.animalType} Vaccination Schedule</h1>
                        <div className="flex gap-2">
                            {schedule.gender && <Badge variant="secondary" className="text-lg px-3 py-1">{schedule.gender}</Badge>}
                            <Badge variant="outline" className="text-lg px-3 py-1 border-white/50 text-white">Standard Protocol</Badge>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid gap-6">
                {schedule.schedule.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        <Card className="overflow-hidden border-l-4 border-l-primary">
                            <CardHeader className="bg-muted/30 pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            {item.disease}
                                            {item.mandatory && (
                                                <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            Recommended vaccination protocol
                                        </CardDescription>
                                    </div>
                                    <div className="bg-background p-2 rounded-full border">
                                        <Info className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">First Dose</p>
                                            <p className="text-lg font-medium">
                                                {item.firstDoseAtDays ? `${item.firstDoseAtDays} days` : `${item.firstDoseAtMonths} months`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full text-purple-600 dark:text-purple-400">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Booster</p>
                                            <p className="text-lg font-medium">
                                                {item.boosterAfterDays 
                                                    ? `After ${item.boosterAfterDays} days` 
                                                    : item.boosterAfterMonths 
                                                        ? `After ${item.boosterAfterMonths} months` 
                                                        : 'Not required'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Repeat</p>
                                            <p className="text-lg font-medium">
                                                {item.repeatEveryDays 
                                                    ? `Every ${item.repeatEveryDays} days` 
                                                    : item.repeatEveryMonths 
                                                        ? `Every ${item.repeatEveryMonths} months` 
                                                        : 'Not required'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {item.notes && (
                                    <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/50 p-3 rounded-md flex gap-3 items-start">
                                        <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200 italic">
                                            Note: {item.notes}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
      </Layout>
  );
}
