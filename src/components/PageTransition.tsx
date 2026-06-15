"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const variants = {
  initial: { opacity: 0, y: 8 },
  enter: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.25, ease: "easeOut" as const } 
  },
  exit: { 
    opacity: 0, 
    y: -6, 
    transition: { duration: 0.15, ease: "easeIn" as const } 
  },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
