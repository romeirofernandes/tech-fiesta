import React from 'react';
import { Navbar } from '../components/Navbar';
import { AuroraBars } from '@/components/ui/aurora-bars';
import { HeroContent } from '@/components/HeroContent';
import Features from '@/components/Features';

const Landing = () => {
  return (
    <div className="relative w-full bg-background text-foreground">
     
      <div className="relative min-h-screen overflow-hidden">
        <Navbar />
        <AuroraBars />
        <HeroContent />
      </div>
      <Features />
    </div>
  );
};

export default Landing;