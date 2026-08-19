"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Bell,
  CirclePlus,
  Dumbbell,
  MessageCircleMore,
  ShoppingBag,
  UserCircle2,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { getSupabaseBrowserClient } from "../lib/supabase";

type ThreadSummary = {
  id: string;
  counterpartName: string;
  counterpartAvatar: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unread: boolean;
};

const coachNav = [
  { href: "/coach", label: "Clients", icon: Users, match: (path: string) => path === "/coach" },
  { href: "/coach/builder", label: "Builder", icon: Dumbbell, match: (path: string) => path.startsWith("/coach/builder") },
  { href: "/coach/messages", label: "Messages", icon: MessageCircleMore, match: (path: string) => path.startsWith("/coach/messages") },
  { href: "/coach/store", label: "Store", icon: ShoppingBag, match: (path: string) => path.startsWith("/coach/store") },
  { href: "/coach/profile", label: "Profile", icon: UserCircle2, match: (path: string) => path.startsWith("/coach/profile") },
  { href: "/coach/onboarding", label: "Invite a client", icon: CirclePlus, match: (path: string) => path.startsWith("/coach/onboarding"), desktopOnly: true }
] as const;

function relativeTime(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function Avatar({ profile, size = "md" }: { profile: { name: string; avatar: string | null }; size?: "sm" | "md" }) {
  const className = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  if (profile.avatar) return <img src={profile.avatar} alt={profile.name} className={cn(className, "rounded-full object-cover")} />;
  return <span className={cn(className, "flex items-center justify-center rounded-full bg-white/[0.08] font-semibold text-white")}>{initials(profile.name) || "C"}</span>;
}

function NavLink({ href, label, icon: Icon, active }: { href: Route; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link href={href} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition", active ? "bg-white/[0.08] font-semibold text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white")}>
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-blue-400" : "text-white/55")} />
      <span>{label}</span>
    </Link>
  );
}

export function CoachShell({ profile, children }: PropsWithChildren<{ profile: { name: string; handle?: string; role: string; avatar: string | null } }>) {
  const pathname = usePathname();
  const activeNav = useMemo(() => coachNav.find((item) => item.match(pathname)) || coachNav[0], [pathname]);
  const isMessages = pathname.includes("/messages");
  const isBuilder = pathname.includes("/builder");
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadThreads, setUnreadThreads] = useState<ThreadSummary[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient("coach");
    if (!supabase) return;
    const client = supabase;

    async function loadUnread() {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.access_token) return;
      try {
        const response = await fetch("/api/messages/threads", { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        const payload = await response.json();
        if (mounted && response.ok) setUnreadThreads(((payload.threads || []) as ThreadSummary[]).filter((thread) => thread.unread));
      } catch {
        // Notifications are best effort and must never block the portal.
      }
    }

    loadUnread();
    const channel = client.channel("coach-shell-notifs").on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, loadUnread).subscribe();
    return () => {
      mounted = false;
      client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  const mobileNav = coachNav.filter((item) => !("desktopOnly" in item && item.desktopOnly));

  return (
    <div className={cn("coach-portal bg-[#08090b] text-white", isMessages ? "h-[100dvh] overflow-hidden" : "min-h-dvh")}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_72%_0%,rgba(37,99,235,0.12),transparent_55%)]" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-white/[0.06] bg-[#0b0c0f]/95 px-4 py-5 lg:flex">
        <Link href="/coach" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-display text-lg font-bold text-black">H</span>
          <span>
            <span className="block text-[11px] font-medium text-white/40">HEIMDALLFIT</span>
            <span className="mt-0.5 block text-sm font-semibold">Coach</span>
          </span>
        </Link>

        <nav className="space-y-1">
          {coachNav.map((item) => <NavLink key={item.href} {...item} active={activeNav.href === item.href} />)}
        </nav>

        <Link href="/coach/onboarding" className="mt-auto rounded-2xl bg-blue-600 p-4 transition hover:bg-blue-500">
          <CirclePlus className="h-5 w-5" />
          <p className="mt-5 text-sm font-semibold">Invite a new client</p>
          <p className="mt-1 text-xs leading-5 text-white/65">Send one link and get them set up.</p>
        </Link>

        <Link href="/coach/profile" className="mt-4 flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.05]">
          <Avatar profile={profile} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{profile.name}</span>
            <span className="block truncate text-xs text-white/40">{profile.handle || profile.role}</span>
          </span>
        </Link>
      </aside>

      <div className={cn("relative lg:pl-[232px]", isMessages ? "h-full min-h-0" : "min-h-dvh")}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/[0.06] bg-[#08090b]/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/coach" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-display font-bold text-black lg:hidden">H</Link>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-[-0.025em]">{activeNav.label}</p>
              <p className="hidden text-xs text-white/40 sm:block">Coach portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
              <button type="button" aria-label="Notifications" onClick={() => setNotifOpen((open) => !open)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/70 transition hover:bg-white/[0.09] hover:text-white">
                <Bell className="h-[18px] w-[18px]" />
                {unreadThreads.length > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold">{unreadThreads.length > 9 ? "9+" : unreadThreads.length}</span> : null}
              </button>

              {notifOpen ? (
                <div className="absolute right-0 top-12 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#15161a] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    <span className="text-xs text-white/40">{unreadThreads.length ? `${unreadThreads.length} new` : "All caught up"}</span>
                  </div>
                  {unreadThreads.length ? unreadThreads.slice(0, 5).map((thread) => (
                    <Link key={thread.id} href="/coach/messages" onClick={() => setNotifOpen(false)} className="flex gap-3 px-4 py-3 transition hover:bg-white/[0.04]">
                      <Avatar profile={{ name: thread.counterpartName, avatar: thread.counterpartAvatar }} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{thread.counterpartName}</strong><span className="text-xs text-white/35">{relativeTime(thread.lastMessageAt)}</span></span>
                        <span className="mt-1 block truncate text-xs text-white/50">{thread.lastMessagePreview}</span>
                      </span>
                    </Link>
                  )) : <p className="px-4 py-8 text-center text-sm text-white/45">No new messages.</p>}
                  <Link href="/coach/messages" onClick={() => setNotifOpen(false)} className="block border-t border-white/[0.06] px-4 py-3 text-sm font-semibold text-blue-400">Open messages</Link>
                </div>
              ) : null}
            </div>
            <Link href="/coach/profile" aria-label="Profile"><Avatar profile={profile} size="sm" /></Link>
          </div>
        </header>

        <main className={cn(
          "mx-auto flex w-full flex-col",
          isMessages
            ? "h-[calc(100dvh-72px)] min-h-0 max-w-none px-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-0 lg:pb-0"
            : "min-h-[calc(100dvh-72px)] max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
          isBuilder && "max-w-none px-0 py-0 sm:px-0 lg:px-0 lg:py-0"
        )}>
          {children}
        </main>
      </div>

      {!isBuilder ? <nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[22px] border border-white/[0.09] bg-[#111216]/95 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden">
        {mobileNav.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return <Link key={href} href={href} className={cn("flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[17px] text-[10px] font-medium transition active:scale-95", active ? "bg-white/[0.08] text-white" : "text-white/45")}><Icon className={cn("h-5 w-5", active && "text-blue-400")} /><span>{label}</span></Link>;
        })}
      </nav> : null}
    </div>
  );
}
