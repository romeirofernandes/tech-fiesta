import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { AuroraBars } from '@/components/ui/aurora-bars';
import { HeroContent } from '@/components/landing/HeroContent';
import About from "@/components/landing/About";
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import CallToAction from '@/components/landing/CallToAction';

const Landing = () => {
  return (
    <div className="relative w-full bg-background text-foreground">
     
      <div className="relative min-h-screen overflow-hidden">
        <Navbar />
        <AuroraBars />
        <HeroContent />
      </div>
      <About />
      <Features />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Landing;