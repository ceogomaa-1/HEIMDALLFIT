"use client";

import { forwardRef, useCallback, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type PanInfo } from "framer-motion";
import { Check, Loader2, SendHorizontal, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";

const DRAG_CONSTRAINTS = { left: 0, right: 155 };
const DRAG_THRESHOLD = 0.9;

type SlideButtonProps = ButtonProps & {
  label?: string;
  successLabel?: string;
  errorLabel?: string;
  onComplete?: () => Promise<void> | void;
};

function StatusIcon({ status }: { status: "loading" | "success" | "error" }) {
  const iconMap: Record<typeof status, ReactNode> = {
    loading: <Loader2 className="animate-spin" size={18} />,
    success: <Check size={18} />,
    error: <X size={18} />
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      {iconMap[status]}
    </motion.div>
  );
}

export const SlideButton = forwardRef<HTMLButtonElement, SlideButtonProps>(
  (
    {
      className,
      label = "Slide to send",
      successLabel = "Invite sent",
      errorLabel = "Try again",
      onComplete,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const dragX = useMotionValue(0);
    const springX = useSpring(0, {
      stiffness: 400,
      damping: 40,
      mass: 0.8
    });
    const dragProgress = useTransform(springX, [0, DRAG_CONSTRAINTS.right], [0, 1]);
    const adjustedWidth = useTransform(springX, (x) => x + 10);

    const reset = useCallback((withDelay = false) => {
      const run = () => {
        dragX.set(0);
        springX.set(0);
        setCompleted(false);
        setStatus("idle");
      };

      if (withDelay) {
        window.setTimeout(run, 1800);
      } else {
        run();
      }
    }, [dragX, springX]);

    const handleDragStart = useCallback(() => {
      if (completed || disabled) return;
      setIsDragging(true);
    }, [completed, disabled]);

    const handleDrag = useCallback(
      (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (completed || disabled) return;
        const nextX = Math.max(0, Math.min(info.offset.x, DRAG_CONSTRAINTS.right));
        dragX.set(nextX);
        springX.set(nextX);
      },
      [completed, disabled, dragX, springX]
    );

    const handleDragEnd = useCallback(async () => {
      if (completed || disabled) return;
      setIsDragging(false);

      if (dragProgress.get() < DRAG_THRESHOLD) {
        dragX.set(0);
        springX.set(0);
        return;
      }

      setCompleted(true);
      setStatus("loading");

      try {
        await onComplete?.();
        setStatus("success");
      } catch {
        setStatus("error");
        reset(true);
      }
    }, [completed, disabled, dragProgress, dragX, onComplete, reset]);

    return (
      <motion.div
        animate={{ width: completed ? "9rem" : "13rem" }}
        transition={{ type: "spring", stiffness: 400, damping: 40, mass: 0.8 }}
        className="relative flex h-11 items-center justify-center rounded-full border border-white/12 bg-[#f5f5f5] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
      >
        {!completed ? (
          <>
            <motion.div
              style={{ width: adjustedWidth }}
              className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#f0c674,#f5f5f5)]"
            />
            <span className="pointer-events-none text-sm font-medium">{label}</span>
            <motion.div
              drag="x"
              dragConstraints={DRAG_CONSTRAINTS}
              dragElastic={0.05}
              dragMomentum={false}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              style={{ x: springX }}
              className="absolute -left-4 z-10 flex cursor-grab active:cursor-grabbing"
            >
              <Button
                ref={ref}
                disabled={disabled || status === "loading"}
                size="icon"
                className={cn(
                  "rounded-full bg-black text-white shadow-[0_12px_20px_rgba(0,0,0,0.4)]",
                  isDragging && "scale-105",
                  className
                )}
                {...props}
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </motion.div>
          </>
        ) : (
          <Button
            ref={ref}
            disabled
            className={cn("h-full w-full rounded-full bg-white text-black", className)}
            {...props}
          >
            <AnimatePresence mode="wait">
              {status === "success" || status === "error" || status === "loading" ? (
                <div className="flex items-center gap-2">
                  <StatusIcon key={status} status={status} />
                  <span>{status === "success" ? successLabel : status === "error" ? errorLabel : "Sending..."}</span>
                </div>
              ) : null}
            </AnimatePresence>
          </Button>
        )}
      </motion.div>
    );
  }
);

SlideButton.displayName = "SlideButton";
