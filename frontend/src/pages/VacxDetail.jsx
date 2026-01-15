import { Layout } from "@/components/Layout"
import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ArrowLeft, Syringe, Calendar, Clock, RotateCw, AlertCircle, Info } from "lucide-react";
import Loading from '@/components/ui/Loading';

export default function VacxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/vacxx/${id}`);
        if (response.ok) {
          const data = await response.json();
          setSchedule(data);
        } else {
            // Fallback to finding in the list if single fetch fails (mock/backup behavior)
            const allResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/vacxx`);
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
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold mb-4">Schedule not found</h2>
                <Button onClick={() => navigate('/vaccination-schedules')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Schedules
                </Button>
            </div>
        </Layout>
    );
  }

  return (
    <Layout>
        <div className="max-w-full px-6 mx-auto space-y-6">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/vaccination-schedules")}
                    className="gap-2 pl-0 hover:bg-transparent hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Schedules
                </Button>
            </div>

            {/* Hero Section */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="overflow-hidden border-none shadow-lg">
                    <div className="relative h-48 bg-gradient-to-r from-primary/10 to-blue-500/10 dark:from-primary/5 dark:to-blue-500/5">
                        <div className="absolute bottom-6 left-6 md:left-10 flex items-end gap-6">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                    {schedule.animalType?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="mb-2">
                                <h1 className="text-3xl font-bold tracking-tight">{schedule.animalType}</h1>
                                <div className="flex gap-2 mt-2">
                                    {schedule.gender && (
                                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                                            {schedule.gender}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="px-3 py-1 text-sm">
                                        {schedule.schedule.length} Vaccines
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Schedule List */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 px-2">
                    <Syringe className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Vaccination Protocol</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedule.schedule.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                            <Card className="h-full hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary/40">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-bold leading-tight flex flex-col gap-0.5">
                                            {item.disease}
                                            <span className="text-[10px] font-normal text-muted-foreground flex items-center gap-0.5">
                                                 <Syringe className="h-2.5 w-2.5" /> Vaccine
                                            </span>
                                        </CardTitle>
                                        {item.mandatory && (
                                            <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
                                                Mandatory
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-muted/30 p-2 rounded-md">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> First Dose
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                {item.firstDoseAtDays ? `${item.firstDoseAtDays} Days` : `${item.firstDoseAtMonths} Months`}
                                            </p>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded-md">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> Booster
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                {item.boosterAfterDays 
                                                    ? `${item.boosterAfterDays} Days` 
                                                    : item.boosterAfterMonths 
                                                        ? `${item.boosterAfterMonths} Months` 
                                                        : 'None'}
                                            </p>
                                        </div>
                                        <div className="bg-muted/30 p-2 rounded-md col-span-2">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                                <RotateCw className="h-3 w-3" /> Repeats
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                 {item.repeatEveryDays 
                                                    ? `Every ${item.repeatEveryDays} Days` 
                                                    : item.repeatEveryMonths 
                                                        ? `Every ${item.repeatEveryMonths} Months` 
                                                        : 'No repetition'}
                                            </p>
                                        </div>
                                    </div>

                                    {item.notes && (
                                        <div className="mt-3 pt-3 border-t flex gap-2">
                                            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <p className="text-sm text-muted-foreground italic leading-relaxed">
                                                "{item.notes}"
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
      </Layout>
  );
}
