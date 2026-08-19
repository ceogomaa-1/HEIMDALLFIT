"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Compass, Dumbbell, Home, MessageCircleMore, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import { cn } from "../../lib/utils";

export type ClientNavItem = {
  href: string;
  label: string;
  desktopLabel: string;
  icon: LucideIcon;
};

export const clientNavItems: ClientNavItem[] = [
  { href: "/client", label: "Today", desktopLabel: "Overview", icon: Home },
  { href: "/client/programs", label: "Programs", desktopLabel: "My programs", icon: Dumbbell },
  { href: "/client/find-coach", label: "Coach", desktopLabel: "Find a coach", icon: Compass },
  { href: "/client/messages", label: "Messages", desktopLabel: "Messages", icon: MessageCircleMore },
  { href: "/client/profile", label: "Profile", desktopLabel: "My profile", icon: UserRound }
];

export function isClientNavItemActive(pathname: string, href: string) {
  return href === "/client" ? pathname === href : pathname.startsWith(href);
}

export default function FuturisticNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Client navigation"
      className="fixed inset-x-3 bottom-[calc(0.55rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-[382px] xl:hidden"
    >
      <LayoutGroup id="client-mobile-navigation">
        <div className="relative isolate flex h-[66px] items-center rounded-full border border-white/[0.09] bg-[rgba(18,18,21,0.84)] px-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[rgba(18,18,21,0.76)]">
          <div className="pointer-events-none absolute inset-x-10 bottom-[-18px] h-10 rounded-full bg-blue-600/10 blur-2xl" />

          {clientNavItems.map((item) => {
            const active = isClientNavItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                prefetch
                draggable={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-[56px] min-w-0 flex-1 touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/80",
                  active ? "text-white" : "text-white/46 hover:text-white/78"
                )}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {active ? (
                  <motion.span
                    layoutId="client-nav-active-pill"
                    className="pointer-events-none absolute inset-1.5 rounded-full bg-white/[0.08]"
                    transition={{ type: "spring", stiffness: 460, damping: 36, mass: 0.75 }}
                  >
                    <span className="absolute inset-x-4 top-1 h-5 rounded-full bg-blue-400/15 blur-xl" />
                  </motion.span>
                ) : null}

                <motion.span
                  className="relative z-10 flex h-7 items-center justify-center"
                  animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-white" : "text-current")} strokeWidth={active ? 2.2 : 1.8} />
                </motion.span>
                <span className="relative z-10 max-w-full truncate px-1 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
