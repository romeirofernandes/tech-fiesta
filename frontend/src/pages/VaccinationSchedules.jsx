import React, { useEffect, useState } from 'react';
import { Layout } from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from 'react-router-dom';

export default function VaccinationSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/vacxx`);
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
    <Layout loading={loading}>
            <h1 className="text-2xl font-bold px-6 mb-6">Vaccination Schedules</h1>
            
            <div className="grid gap-6 md:grid-cols-2 px-6 lg:grid-cols-3">
                {schedules.map((schedule) => (
                    <Card 
                        key={schedule._id} 
                        className="h-full cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden p-0 gap-0 border-none shadow-md group"
                        onClick={() => navigate(`/vacxx/${schedule._id}`)}
                    >
                        <div className="h-60 w-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                            <img 
                                src={schedule.image || '/placeholder/cow.png'} 
                                alt={`${schedule.animalType} ${schedule.gender || ''}`} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder/cow.png'; }}
                            />
                        </div>
                        <CardHeader className="pt-5 pb-3">
                            <CardTitle className="flex justify-between items-center">
                                <span className="text-xl">{schedule.animalType}</span>
                                {schedule.gender && <Badge variant="secondary">{schedule.gender}</Badge>}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>
    </Layout>
  );
}
