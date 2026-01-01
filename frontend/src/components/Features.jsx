import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Activity, Wifi, Bell, BarChart3, Shield, Heart, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { useTheme } from '@/context/ThemeContext'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Features() {
    return (
        <section className="relative bg-background py-16 md:py-32">
            <div className="mx-auto max-w-2xl px-6 lg:max-w-6xl">
                <div className="mx-auto grid gap-4 lg:grid-cols-2">
                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Activity}
                                title="Health Monitoring"
                                description="Track vital signs with IoT sensors. Monitor temperature, heart rate, and activity levels in real-time."
                            />
                        </CardHeader>

                        <div className="relative border-t border-dashed border-zinc-700 overflow-hidden">
                            <div
                                aria-hidden
                                className="absolute inset-0 [background:radial-gradient(125%_125%_at_50%_0%,transparent_40%,oklch(0.35_0.08_140),var(--background)_100%)]"
                            />
                            <div className="aspect-4/3 p-6">
                                <HealthSlideshow />
                            </div>
                        </div>
                    </FeatureCard>

                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Shield}
                                title="RFID Tracking"
                                description="Individual animal identification with RFID tags. Track movement and location history."
                            />
                        </CardHeader>

                        <CardContent className="pb-6">
                            <div className="relative">
                                <div className="aspect-4/3 overflow-hidden rounded-lg border border-zinc-700">
                                    <LivestockMap />
                                </div>
                            </div>
                        </CardContent>
                    </FeatureCard>

                    <FeatureCard className="p-6 lg:col-span-2">
                        <p className="mx-auto my-6 max-w-md text-balance text-center text-2xl font-semibold">
                            Smart alerts for health anomalies and vaccination schedules.
                        </p>

                        <div className="flex justify-center gap-6 overflow-hidden">
                            <CircularUI
                                label="Health"
                                icon={Activity}
                            />

                            <CircularUI
                                label="Sensors"
                                icon={Wifi}
                            />

                            <CircularUI
                                label="Alerts"
                                icon={Bell}
                            />

                            <CircularUI
                                label="Analytics"
                                icon={BarChart3}
                                className="hidden sm:block"
                            />
                        </div>
                    </FeatureCard>
                </div>
            </div>
        </section>
    )
}

const LivestockMap = () => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sample livestock locations
    const livestockLocations = [
        { id: 1, position: [19.076, 72.877], name: "Cow #A123", status: "healthy" },
        { id: 2, position: [19.078, 72.879], name: "Buffalo #B456", status: "healthy" },
        { id: 3, position: [19.074, 72.875], name: "Goat #G789", status: "alert" },
        { id: 4, position: [19.080, 72.881], name: "Sheep #S012", status: "healthy" },
    ];

    if (!mounted) return null;

    const isDark = theme === 'dark';

    return (
        <div className="h-full w-full relative z-0">
            <MapContainer
                center={[19.076, 72.877]}
                zoom={15.7}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer
                    url={isDark 
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                    }
                    maxZoom={20}
                />
                
                {livestockLocations.map((animal) => (
                    <div key={animal.id}>
                        <Circle
                            center={animal.position}
                            radius={100}
                            pathOptions={{
                                color: animal.status === 'healthy' ? '#4ade80' : '#ef4444',
                                fillColor: animal.status === 'healthy' ? '#4ade80' : '#ef4444',
                                fillOpacity: 0.2,
                                weight: 2,
                            }}
                        />
                        <Marker position={animal.position}>
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-semibold">{animal.name}</p>
                                    <p className={cn(
                                        "text-xs",
                                        animal.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                                    )}>
                                        Status: {animal.status}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    </div>
                ))}
            </MapContainer>
        </div>
    );
};

const HealthSlideshow = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const slides = [
        {
            icon: Activity,
            label: 'Temperature',
            value: '38.5°C',
            percentage: 75,
        },
        {
            icon: Heart,
            label: 'Heart Rate',
            value: '72 BPM',
            percentage: 60,
        },
        {
            icon: TrendingUp,
            label: 'Movement',
            value: '2.3 km',
            percentage: 85,
        },
    ];

    useEffect(() => {
        if (!isPaused) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % slides.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isPaused, slides.length]);

    const currentSlide = slides[currentIndex];

    return (
        <div
            className="h-full w-full rounded-lg border border-zinc-700 bg-card/50 backdrop-blur-sm p-6 flex items-center justify-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="space-y-4 w-full">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <currentSlide.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{currentSlide.label}</p>
                        <p className="text-2xl font-semibold">{currentSlide.value}</p>
                    </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${currentSlide.percentage}%` }}
                    ></div>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={cn(
                                'h-1.5 rounded-full transition-all',
                                index === currentIndex
                                    ? 'w-8 bg-primary'
                                    : 'w-1.5 bg-zinc-700 hover:bg-zinc-600'
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ children, className }) => (
    <Card className={cn('group relative rounded-xl shadow-sm border-zinc-700 overflow-hidden', className)}>
        <CardDecorator />
        {children}
    </Card>
)

const CardDecorator = () => (
    <>
        <span className="absolute -left-px -top-px block size-2 border-l-2 border-t-2 border-primary z-10"></span>
        <span className="absolute -right-px -top-px block size-2 border-r-2 border-t-2 border-primary z-10"></span>
        <span className="absolute -bottom-px -left-px block size-2 border-b-2 border-l-2 border-primary z-10"></span>
        <span className="absolute -bottom-px -right-px block size-2 border-b-2 border-r-2 border-primary z-10"></span>
    </>
)

const CardHeading = ({ icon: Icon, title, description }) => (
    <div className="p-6">
        <span className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-4" />
            {title}
        </span>
        <p className="mt-8 text-2xl font-semibold">{description}</p>
    </div>
)

const CircularUI = ({ label, icon: Icon, className }) => (
    <div className={className}>
        <div className="bg-linear-to-b from-zinc-700 to-transparent size-fit rounded-2xl p-px">
            <div className="bg-linear-to-b from-background to-muted/25 relative flex aspect-square w-fit items-center justify-center rounded-[15px] p-6">
                <div className="size-12 sm:size-14 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                    <Icon className="size-6 sm:size-7 text-primary" />
                </div>
            </div>
        </div>
        <span className="mt-1.5 block text-center text-sm text-muted-foreground">{label}</span>
    </div>
)