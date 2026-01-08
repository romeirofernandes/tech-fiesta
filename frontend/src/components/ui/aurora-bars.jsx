import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const AuroraBars = ({ className }) => {
  // Heights relative to the container, creating a V-shape
  const bars = [
    { height: "65%", opacity: 0.3 },
    { height: "50%", opacity: 0.4 },
    { height: "40%", opacity: 0.5 },
    { height: "30%", opacity: 0.6 },
    { height: "25%", opacity: 0.7 },
    { height: "20%", opacity: 0.8 },
    { height: "15%", opacity: 0.9 }, // Center
    { height: "20%", opacity: 0.8 },
    { height: "25%", opacity: 0.7 },
    { height: "30%", opacity: 0.6 },
    { height: "40%", opacity: 0.5 },
    { height: "50%", opacity: 0.4 },
    { height: "65%", opacity: 0.3 },
  ];

  return (
    <>
      {/* Bars Background */}
      <div className={cn("absolute inset-0 flex items-end w-full h-full gap-0 justify-between pb-0 pointer-events-none", className)}>
        {bars.map((bar, index) => (
          <motion.div
            key={index}
            className="w-full rounded-t-sm bg-linear-to-t from-primary via-primary/60 to-transparent"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: bar.height, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: Math.abs(index - Math.floor(bars.length / 2)) * 0.1,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Gradient Overlay to fade top and bottom */}
      <div className="absolute inset-0 bg-linear-to-b from-background via-transparent to-background/60 pointer-events-none" />
    </>
  );
};