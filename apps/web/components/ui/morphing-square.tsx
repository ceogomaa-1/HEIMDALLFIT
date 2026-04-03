"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

export interface MorphingSquareProps {
  message?: string;
  messagePlacement?: "top" | "bottom" | "left" | "right";
}

const placementClasses: Record<NonNullable<MorphingSquareProps["messagePlacement"]>, string> = {
  bottom: "flex-col",
  top: "flex-col-reverse",
  right: "flex-row",
  left: "flex-row-reverse"
};

export function MorphingSquare({
  className,
  message,
  messagePlacement = "bottom",
  ...props
}: HTMLMotionProps<"div"> & MorphingSquareProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", placementClasses[messagePlacement])}>
      <motion.div
        className={cn("h-10 w-10 bg-white", className)}
        animate={{
          borderRadius: ["6%", "50%", "6%"],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut"
        }}
        {...props}
      />
      {message ? <div className="text-sm text-white/70">{message}</div> : null}
    </div>
  );
}
