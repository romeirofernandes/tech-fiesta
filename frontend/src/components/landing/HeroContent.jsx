import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { TrustedFeatures } from '@/components/landing/TrustedFeatures';

export const HeroContent = () => {
  return (
    <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4 pt-20">
      <motion.h1 
        className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-5xl leading-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Smart Livestock Management{" "}
        <br className="hidden md:block" />
        <span className="text-primary">Simplified</span>
      </motion.h1>

      <motion.p 
        className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-12 leading-relaxed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        Digitally track livestock identity, health, movement, and vaccination history 
        with <span className="text-foreground font-semibold">RFID tags</span> and{" "}
        <span className="text-foreground font-semibold">IoT sensors</span> in real-time.
      </motion.p>

      <motion.div 
        className="flex flex-col sm:flex-row items-center gap-6 mb-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Button
          asChild
          size="lg"
          className="flex items-center justify-start gap-3 rounded-full font-medium hover:scale-105 active:scale-95 transition-all"
          style={{ paddingLeft: '4px', paddingRight: '24px' }}
        >
          <Link to="/register">
            <div className="bg-primary-foreground rounded-full p-2">
              <Search className="w-4 h-4 text-primary" />
            </div>
            Get Started
          </Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          size="lg"
          className="flex items-center gap-2 font-medium group"
        >
          <Link to="/login">
            Learn more
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </motion.div>

      <TrustedFeatures />
    </div>
  );
};