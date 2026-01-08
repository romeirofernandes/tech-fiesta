import { Activity, Shield, Database, Bell } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function About() {
    return (
        <section id="about" className="py-16 md:py-32 scroll-mt-20">
            <div className="mx-auto max-w-6xl space-y-8 md:space-y-16">
                <h2 className="relative z-10 max-w-2xl text-4xl font-medium lg:text-5xl">
                    The पशु पहचान ecosystem brings together livestock management.
                </h2>
                <div className="flex flex-col gap-10">
                    <div className="space-y-4">
                        <p>
                            पशु पहचान is evolving to be more than just tracking. <span className="font-medium">It supports an entire ecosystem</span> — from RFID tags to health monitoring.
                        </p>
                        <p>
                            It supports an entire ecosystem — from IoT sensors to real-time analytics and platforms helping farmers and veterinarians innovate.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Activity className="size-4 text-primary" />
                                    <h3 className="text-sm font-medium">Real-time</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Monitor health vitals and movement patterns instantly with IoT sensors.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="size-4 text-primary" />
                                    <h3 className="text-sm font-medium">Secure</h3>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    RFID-based identification ensures tamper-proof livestock records.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-zinc-700 relative rounded-2xl border border-dashed p-2 bg-card/50 backdrop-blur-sm">
                        <div className="rounded-xl p-6 bg-linear-to-br from-background via-card to-secondary/20">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                                <Card className="p-6 border-zinc-700 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors">
                                    <Database className="size-8 text-primary mb-3" />
                                    <h4 className="font-semibold mb-2">Digital Records</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Complete vaccination and health history stored securely
                                    </p>
                                </Card>
                                <Card className="p-6 border-zinc-700 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors">
                                    <Bell className="size-8 text-primary mb-3" />
                                    <h4 className="font-semibold mb-2">Smart Alerts</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Automated reminders for vaccinations and checkups
                                    </p>
                                </Card>
                                <Card className="p-6 border-zinc-700 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors">
                                    <Activity className="size-8 text-primary mb-3" />
                                    <h4 className="font-semibold mb-2">Health Monitoring</h4>
                                    <div className="flex items-end justify-center gap-2 mt-4">
                                        <div className="h-12 w-4 bg-primary/30 rounded-t"></div>
                                        <div className="h-16 w-4 bg-primary/50 rounded-t"></div>
                                        <div className="h-20 w-4 bg-primary/70 rounded-t"></div>
                                        <div className="h-24 w-4 bg-primary rounded-t"></div>
                                        <div className="h-20 w-4 bg-primary/70 rounded-t"></div>
                                        <div className="h-16 w-4 bg-primary/50 rounded-t"></div>
                                        <div className="h-12 w-4 bg-primary/30 rounded-t"></div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}