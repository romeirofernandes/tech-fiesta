import React from 'react';
import { Navbar } from '../components/Navbar';
import { AuroraBars } from '@/components/ui/aurora-bars';
import { HeroContent } from '@/components/HeroContent';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import CallToAction from '@/components/CallToAction';

const Landing = () => {
  return (
    <div className="relative w-full bg-background text-foreground">
     
      <div className="relative min-h-screen overflow-hidden">
        <Navbar />
        <AuroraBars />
        <HeroContent />
      </div>
      <Features />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Landing;