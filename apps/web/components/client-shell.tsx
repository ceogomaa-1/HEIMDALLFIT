"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Compass,
  Dumbbell,
  LayoutGrid,
  Menu,
  MessageCircleMore,
  Search,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/utils";

const clientNav = [
  { href: "/client", label: "Today", desktopLabel: "Overview", icon: LayoutGrid, match: (pathname: string, hash: string) => pathname === "/client" && hash !== "#programs" },
  { href: "/client#programs", label: "Programs", desktopLabel: "My programs", icon: Dumbbell, match: (pathname: string, hash: string) => pathname === "/client" && hash === "#programs" },
  { href: "/client/find-coach", label: "Coach", desktopLabel: "Find a coach", icon: Compass, match: (pathname: string) => pathname.startsWith("/client/find-coach") },
  { href: "/client/messages", label: "Messages", desktopLabel: "Messages", icon: MessageCircleMore, match: (pathname: string) => pathname.startsWith("/client/messages") }
] as const;

function InitialAvatar({ profile, size = "md" }: { profile: { name: string; avatar: string | null }; size?: "sm" | "md" | "lg" }) {
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const sizeClass = size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-xs";

  return profile.avatar ? (
    <img src={profile.avatar} alt={profile.name} className={cn(sizeClass, "rounded-full object-cover")} />
  ) : (
    <span className={cn(sizeClass, "flex items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.42),rgba(16,185,129,0.18))] font-mono font-semibold text-white")}>
      {initials || "C"}
    </span>
  );
}

function DesktopNavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href as Route}
      className={cn(
        "group relative flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm transition-colors",
        active ? "bg-blue-500/10 font-semibold text-white" : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
      )}
    >
      <span className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r-full", active ? "bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.7)]" : "bg-transparent")} />
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-blue-400" : "text-white/38 group-hover:text-white/70")} />
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link href={href as Route} className={cn("relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2 text-[10px] font-medium", active ? "text-blue-400" : "text-white/42")}>
      {active ? <span className="absolute top-0 h-[3px] w-7 rounded-b-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.72)]" /> : null}
      <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.8} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function ClientShell({
  profile,
  children
}: PropsWithChildren<{ profile: { name: string; handle?: string; role: string; avatar: string | null } }>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hash, setHash] = useState("");
  const activeNav = useMemo(() => clientNav.find((item) => item.match(pathname, hash)) || clientNav[0], [hash, pathname]);
  const isMessages = pathname.startsWith("/client/messages");

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#050507] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10),transparent_68%)]" />
        <div className="absolute -bottom-52 left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.055),transparent_68%)]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/[0.055] bg-[rgba(7,7,12,0.90)] p-4 backdrop-blur-3xl xl:flex">
        <Link href="/client" className="mb-8 flex items-center gap-3 px-2 pt-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 font-display text-lg font-bold text-white shadow-[0_0_30px_rgba(37,99,235,0.15)]">H</span>
          <span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.28em] text-white/28">HEIMDALLFIT</span>
            <span className="mt-1 block font-display text-base font-semibold text-white">Client</span>
          </span>
        </Link>

        <p className="px-4 font-mono text-[9px] uppercase tracking-[0.24em] text-white/22">Your space</p>
        <nav className="mt-3 space-y-1">
          {clientNav.map((item) => (
            <DesktopNavLink key={item.href} href={item.href} label={item.desktopLabel} icon={item.icon} active={activeNav.href === item.href} />
          ))}
        </nav>

        <Link href="/client/find-coach" className="mt-auto overflow-hidden rounded-[22px] border border-blue-400/15 bg-[linear-gradient(145deg,rgba(37,99,235,0.12),rgba(255,255,255,0.025))] p-5 transition hover:border-blue-400/30">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-blue-300/70">Build your team</p>
          <p className="mt-3 font-display text-xl font-semibold leading-tight text-white">Find the coach who fits you.</p>
          <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-300">Explore coaches <ChevronRight className="h-3.5 w-3.5" /></span>
        </Link>

        <button type="button" onClick={() => setMenuOpen(true)} className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-2.5 text-left">
          <span className="relative"><InitialAvatar profile={profile} /><span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0b0b11] bg-emerald-400" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{profile.name}</span><span className="block truncate text-[11px] text-white/35">{profile.handle || profile.role}</span></span>
          <ChevronRight className="h-4 w-4 text-white/25" />
        </button>
      </aside>

      <div className="relative flex h-full min-w-0 flex-col xl:pl-[248px]">
        <header className="z-20 flex shrink-0 items-center justify-between border-b border-white/[0.055] bg-[rgba(5,5,8,0.82)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl sm:px-6 xl:h-[72px] xl:px-8 xl:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/client" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-blue-400/20 bg-blue-500/10 font-display text-sm font-bold text-white xl:hidden">H</Link>
            <div className="min-w-0">
              <p className="hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/28 xl:block">Client portal</p>
              <h1 className="truncate font-display text-[17px] font-semibold tracking-[-0.03em] text-white xl:mt-1 xl:text-lg">{activeNav.desktopLabel}</h1>
            </div>
          </div>

          <label className="mx-8 hidden h-10 w-full max-w-sm items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 lg:flex">
            <Search className="h-4 w-4 text-white/30" />
            <input aria-label="Search client portal" placeholder="Search your HEIMDALLFIT..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25" />
          </label>

          <div className="flex items-center gap-2">
            <Link href="/client/messages" aria-label="Open messages" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.035] text-white/62 transition hover:text-white">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#09090d] bg-blue-500" />
            </Link>
            <button type="button" aria-label="Open account menu" onClick={() => setMenuOpen(true)} className="rounded-full p-0.5"><InitialAvatar profile={profile} size="sm" /></button>
          </div>
        </header>

        <div className={cn("flex min-h-0 flex-1 flex-col", isMessages ? "px-0 pb-[calc(68px+env(safe-area-inset-bottom))] pt-0 xl:px-6 xl:py-5" : "px-4 pb-0 pt-4 sm:px-6 xl:px-8 xl:pb-6 xl:pt-6")}>
          <main className="portal-page flex min-h-0 flex-1 flex-col">{children}</main>
        </div>
      </div>

      <nav aria-label="Client navigation" className="fixed inset-x-0 bottom-0 z-40 flex min-h-[68px] border-t border-white/[0.08] bg-[rgba(7,7,11,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-3xl xl:hidden">
        {clientNav.map((item) => <MobileNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={activeNav.href === item.href} />)}
        <button type="button" onClick={() => setMenuOpen(true)} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2 text-[10px] font-medium text-white/42">
          <Menu className="h-5 w-5" strokeWidth={1.8} /><span>More</span>
        </button>
      </nav>

      {menuOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/70 backdrop-blur-sm xl:items-center xl:justify-center" role="dialog" aria-modal="true" aria-label="Client menu" onMouseDown={(event) => { if (event.currentTarget === event.target) setMenuOpen(false); }}>
          <section className="w-full rounded-t-[30px] border border-white/[0.08] bg-[#0d0d13] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl xl:max-w-sm xl:rounded-[28px] xl:p-6">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 xl:hidden" />
            <div className="flex items-center gap-3">
              <InitialAvatar profile={profile} size="lg" />
              <div className="min-w-0 flex-1"><p className="truncate font-display text-lg font-semibold text-white">{profile.name}</p><p className="truncate text-xs text-white/40">{profile.handle || profile.role}</p></div>
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/60"><X className="h-5 w-5" /></button>
            </div>
            <div className="my-5 h-px bg-white/[0.06]" />
            <nav className="grid grid-cols-2 gap-2">
              {clientNav.map((item) => (
                <Link key={`menu-${item.href}`} href={item.href} className="flex min-h-20 flex-col justify-between rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-3.5 text-white/70">
                  <item.icon className="h-5 w-5 text-blue-400" /><span className="text-sm font-semibold">{item.desktopLabel}</span>
                </Link>
              ))}
            </nav>
            <p className="mt-5 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-white/20">HEIMDALLFIT · Client OS</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
