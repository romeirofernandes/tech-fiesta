import React from 'react';
import { motion } from 'framer-motion';

const Loading = () => {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute h-16 w-16 rounded-full border-4 border-primary/30"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="h-16 w-16 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
            className="absolute text-xs font-medium text-primary"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
        >
            Loading
        </motion.div>
      </div>
    </div>
  );
};

export default Loading;
