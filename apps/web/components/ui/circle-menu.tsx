"use client";

import { cx } from "@heimdallfit/ui";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const CONSTANTS = {
  itemSize: 48,
  containerSize: 250,
  openStagger: 0.02,
  closeStagger: 0.07
} as const;

const STYLES = {
  trigger: {
    container:
      "rounded-full flex items-center justify-center cursor-pointer outline-none ring-0 transition-all duration-100 z-50 bg-white text-black hover:brightness-110",
    active: "bg-white"
  },
  item: {
    container:
      "rounded-full flex items-center justify-center absolute bg-white/8 border border-white/10 text-white hover:bg-white/16 cursor-pointer backdrop-blur-xl",
    label: "text-[11px] text-white absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap"
  }
} as const;

const pointOnCircle = (i: number, n: number, r: number, cx = 0, cy = 0) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  return {
    x: cx + r * Math.cos(theta),
    y: cy + r * Math.sin(theta)
  };
};

type CircleMenuItem = {
  label: string;
  icon: React.ReactNode;
  href: string;
};

function MenuItem({
  icon,
  label,
  href,
  index,
  totalItems,
  isOpen
}: CircleMenuItem & { index: number; totalItems: number; isOpen: boolean }) {
  const { x, y } = pointOnCircle(index, totalItems, CONSTANTS.containerSize / 2);
  const [hovering, setHovering] = useState(false);

  return (
    <motion.a
      href={href}
      initial={false}
      animate={{
        x: isOpen ? x : 0,
        y: isOpen ? y : 0,
        scale: isOpen ? 1 : 0.6,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none"
      }}
      transition={{
        delay: isOpen ? index * CONSTANTS.openStagger : index * CONSTANTS.closeStagger,
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className="absolute left-1/2 top-1/2 z-10"
      style={{ marginLeft: -(CONSTANTS.itemSize - 2) / 2, marginTop: -(CONSTANTS.itemSize - 2) / 2 }}
    >
      <motion.button
        whileHover={{ scale: 1.1, transition: { duration: 0.1 } }}
        style={{ height: CONSTANTS.itemSize - 2, width: CONSTANTS.itemSize - 2 }}
        className={STYLES.item.container}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {icon}
        {hovering ? <p className={STYLES.item.label}>{label}</p> : null}
      </motion.button>
    </motion.a>
  );
}

function MenuTrigger({
  setIsOpen,
  isOpen,
  itemsLength,
  closeAnimationCallback,
  openIcon,
  closeIcon
}: {
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
  itemsLength: number;
  closeAnimationCallback: () => void;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
}) {
  const animate = useAnimationControls();
  const shakeAnimation = useAnimationControls();

  const scaleTransition = Array.from({ length: itemsLength - 1 })
    .map((_, index) => index + 1)
    .reduce((acc, _, index) => {
      acc.push(1 + index * 0.15);
      return acc;
    }, [] as number[]);

  const closeAnimation = async () => {
    shakeAnimation.start({
      translateX: [0, 2, -2, 0, 2, -2, 0],
      transition: {
        duration: CONSTANTS.closeStagger,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop"
      }
    });

    for (let i = 0; i < scaleTransition.length; i += 1) {
      await animate.start({
        height: Math.min(CONSTANTS.itemSize * scaleTransition[i], CONSTANTS.itemSize + CONSTANTS.itemSize / 2),
        width: Math.min(CONSTANTS.itemSize * scaleTransition[i], CONSTANTS.itemSize + CONSTANTS.itemSize / 2),
        transition: {
          duration: CONSTANTS.closeStagger / 2,
          ease: "linear"
        }
      });
      if (i !== scaleTransition.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, CONSTANTS.closeStagger * 1000));
      }
    }

    shakeAnimation.stop();
    shakeAnimation.start({ translateX: 0, transition: { duration: 0 } });
    animate.start({
      height: CONSTANTS.itemSize,
      width: CONSTANTS.itemSize,
      transition: { duration: 0.1, ease: "backInOut" }
    });
  };

  return (
      <motion.div animate={shakeAnimation} className="z-50">
      <motion.button
        type="button"
        animate={animate}
        style={{ height: CONSTANTS.itemSize, width: CONSTANTS.itemSize }}
        className={cx(STYLES.trigger.container, isOpen && STYLES.trigger.active)}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            closeAnimationCallback();
            closeAnimation();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {isOpen ? (
            <motion.span
              key="menu-close"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.2 }}
            >
              {closeIcon}
            </motion.span>
          ) : (
            <motion.span
              key="menu-open"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.2 }}
            >
              {openIcon}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

export function CircleMenu({
  items,
  openIcon = <Menu size={18} className="text-black" />,
  closeIcon = <X size={18} className="text-black" />
}: {
  items: CircleMenuItem[];
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const animate = useAnimationControls();

  const closeAnimationCallback = async () => {
    await animate.start({
      rotate: -360,
      filter: "blur(1px)",
      transition: {
        duration: CONSTANTS.closeStagger * (items.length + 2),
        ease: "linear"
      }
    });
    await animate.start({
      rotate: 0,
      filter: "blur(0px)",
      transition: { duration: 0 }
    });
  };

  return (
    <div
      style={{ width: CONSTANTS.containerSize, height: CONSTANTS.containerSize }}
      className="relative flex items-center justify-center place-self-center"
    >
      <MenuTrigger
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        itemsLength={items.length}
        closeAnimationCallback={closeAnimationCallback}
        openIcon={openIcon}
        closeIcon={closeIcon}
      />
      <motion.div animate={animate} className="absolute inset-0 z-0 flex items-center justify-center">
        {items.map((item, index) => (
          <MenuItem
            key={`menu-item-${index}`}
            icon={item.icon}
            label={item.label}
            href={item.href}
            index={index}
            totalItems={items.length}
            isOpen={isOpen}
          />
        ))}
      </motion.div>
    </div>
  );
}
