import React from 'react';
import { Navbar } from '../components/Navbar';
import { AuroraBars } from '@/components/ui/aurora-bars';
import { HeroContent } from '@/components/HeroContent';

const Landing = () => {
  return (
    <div className="relative w-full min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      <div className="relative z-10">
        <AuroraBars />
        <HeroContent />
      </div>
    </div>
  );
};

export default Landing;