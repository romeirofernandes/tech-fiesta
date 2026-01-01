import React from "react";
import { motion } from "framer-motion";
import { Activity, Shield, Wifi, Database, Bell, BarChart3 } from "lucide-react";

export const TrustedFeatures = () => {
  const features = [
    { icon: Activity, label: "Health Monitoring" },
    { icon: Shield, label: "RFID Tracking" },
    { icon: Wifi, label: "IoT Sensors" },
    { icon: Database, label: "Data History" },
    { icon: Bell, label: "Smart Alerts" },
    { icon: BarChart3, label: "Analytics" },
  ];

  return (
    <motion.div 
      className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto relative z-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
    >
      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
        Trusted by <span className="text-foreground font-semibold">400+</span> farmers worldwide
      </p>

      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 w-full">
        {features.map((feature, index) => (
          <motion.div
            key={feature.label}
            className="flex flex-col items-center gap-2 group cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {feature.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};