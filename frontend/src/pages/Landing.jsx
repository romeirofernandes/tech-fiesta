import React from 'react';
import { Navbar } from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 px-6 max-w-6xl mx-auto">
        <section className="py-20 text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
            Smart Livestock Management <br className="hidden lg:block" />
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Digitally track identity, health, movement, and vaccination history with RFID tags and IoT sensors.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/register">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-20 grid md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-xl bg-card shadow-sm">
                <h3 className="text-xl font-bold mb-2">Real-time Tracking</h3>
                <p className="text-muted-foreground">Monitor location and movement patterns 24/7 with precision.</p>
            </div>
            <div className="p-6 border rounded-xl bg-card shadow-sm">
                <h3 className="text-xl font-bold mb-2">Health Monitoring</h3>
                <p className="text-muted-foreground">Automated vitals tracking and instant health alerts for farmers.</p>
            </div>
            <div className="p-6 border rounded-xl bg-card shadow-sm">
                <h3 className="text-xl font-bold mb-2">Lifecycle Records</h3>
                <p className="text-muted-foreground">Complete digital history from birth to sale, ensuring transparency.</p>
            </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;