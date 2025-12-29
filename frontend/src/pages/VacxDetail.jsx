import { Layout } from "@/components/Layout"
import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion";
import { ArrowLeft, Syringe } from "lucide-react";
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
        <div className="flex flex-col items-center justify-center h-screen">
            <h2 className="text-2xl font-bold mb-4">Schedule not found</h2>
            <Button onClick={() => navigate('/vaccination-schedules')}>Back to Schedules</Button>
        </div>
    );
  }

  return (
    <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8">
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >

                <div className="mb-8">
                    <h1 className="text-3xl font-semibold mb-2">{schedule.animalType}</h1>
                    <div className="flex gap-2 items-center">
                        {schedule.gender && (
                            <Badge variant="secondary" className="font-normal">
                                {schedule.gender}
                            </Badge>
                        )}
                    </div>
                </div>
            </motion.div>

            <div className="space-y-2">
                {schedule.schedule.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                        <Card className="border border-border/40 hover:border-border transition-colors">
                            <CardContent className="px-4 py-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 flex-1">
                                        <div className="p-1.5 rounded bg-primary/10">
                                            <Syringe className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                            <h3 className="font-medium text-sm">
                                                {item.disease}
                                            </h3>
                                            {item.mandatory && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal border-red-200 text-red-700 dark:border-red-800 dark:text-red-400">
                                                    Mandatory
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-[10px]">First Dose</p>
                                            <p className="font-medium text-xs">
                                                {item.firstDoseAtDays ? `${item.firstDoseAtDays}d` : `${item.firstDoseAtMonths}m`}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-muted-foreground text-[10px]">Booster</p>
                                            <p className="font-medium text-xs">
                                                {item.boosterAfterDays 
                                                    ? `${item.boosterAfterDays}d` 
                                                    : item.boosterAfterMonths 
                                                        ? `${item.boosterAfterMonths}m` 
                                                        : '—'}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-muted-foreground text-[10px]">Repeat</p>
                                            <p className="font-medium text-xs">
                                                {item.repeatEveryDays 
                                                    ? `${item.repeatEveryDays}d` 
                                                    : item.repeatEveryMonths 
                                                        ? `${item.repeatEveryMonths}m` 
                                                        : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {item.notes && (
                                    <div className="mt-2 pt-2 border-t border-border/40">
                                        <p className="text-[10px] text-muted-foreground">
                                            {item.notes}
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
