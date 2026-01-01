import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function CallToAction() {
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <section className="py-16">
            <div className="mx-auto max-w-6xl rounded-3xl border border-border px-6 bg-card py-12 md:py-20 lg:py-32 shadow-sm">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl text-foreground">
                        Transform your livestock management today
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        Digitize records, monitor health, and track every animal in real time with पशु पहचान.
                    </p>
                    <div className="mt-12 flex flex-wrap justify-center gap-4">
                        <Button asChild size="lg">
                            <Link to="/register">
                                <span>Get Started</span>
                            </Link>
                        </Button>
                        <Button 
                            size="lg" 
                            variant="outline"
                            onClick={() => scrollToSection('features')}
                        >
                            <span>See Features</span>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}