"use client";

import {
  Bell,
  ChevronRight,
  CirclePlus,
  Cog,
  MessageCircleMore,
  Moon,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  UserCircle2,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

const coachNav = [
  { href: "/coach", label: "Clients", icon: Users, match: (pathname: string) => pathname === "/coach" },
  { href: "/coach/messages", label: "Messages", icon: MessageCircleMore, match: (pathname: string) => pathname.startsWith("/coach/messages") },
  { href: "/coach/store", label: "My Store", icon: ShoppingBag, match: (pathname: string) => pathname.startsWith("/coach/store") },
  { href: "/coach/profile", label: "My Profile", icon: UserCircle2, match: (pathname: string) => pathname.startsWith("/coach/profile") },
  { href: "/coach/builder", label: "Plan & Diet Builder", icon: SlidersHorizontal, match: (pathname: string) => pathname.startsWith("/coach/builder") },
  { href: "/coach/onboarding", label: "Onboarding", icon: CirclePlus, match: (pathname: string) => pathname.startsWith("/coach/onboarding") },
  { href: "/coach#settings", label: "Settings", icon: Cog, match: () => false }
] as const;

function HeaderButton({
  icon: Icon,
  href,
  ping = false
}: {
  icon: LucideIcon;
  href?: string | null;
  ping?: boolean;
}) {
  const inner = (
    <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.06] bg-white/[0.03] text-[var(--text-muted)] transition-all duration-200 hover:scale-[1.03] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-[var(--text-primary)]">
      <Icon className="h-4 w-4" />
      {ping ? (
        <span
          style={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            width: "8px",
            height: "8px",
            borderRadius: "999px",
            background: "var(--combat)",
            boxShadow: "0 0 0 2px var(--bg-deep), 0 0 8px var(--combat-glow)",
            animation: "pulse-ring 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite"
          }}
        />
      ) : null}
    </span>
  );

  return href ? <a href={href}>{inner}</a> : <button type="button">{inner}</button>;
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] transition-all duration-300",
        active
          ? "bg-[rgba(37,99,235,0.10)] font-semibold text-[var(--text-primary)] shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]"
          : "text-[var(--text-muted)] hover:bg-white/[0.035] hover:text-[var(--text-secondary)]"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-2 bottom-2 w-[4px] rounded-r-full transition-all duration-300",
          active ? "bg-[var(--accent-bright)] shadow-[0_0_12px_var(--accent-glow)]" : "bg-transparent group-hover:bg-white/10"
        )}
      />
      <Icon className={cn("h-4 w-4 transition-transform duration-300", active ? "text-[var(--accent-bright)]" : "group-hover:scale-110 group-hover:text-[var(--text-secondary)]")} />
      <span className="truncate">{label}</span>
    </a>
  );
}

export function CoachShell({
  profile,
  children
}: PropsWithChildren<{ profile: { name: string; handle?: string; role: string; avatar: string | null } }>) {
  const pathname = usePathname();
  const activeNav = useMemo(
    () => coachNav.find((item) => item.match(pathname)) || coachNav[0],
    [pathname]
  );

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  // ── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored) setTheme(stored);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", next);
  }

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadThreads, setUnreadThreads] = useState<ThreadSummary[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  async function loadUnread() {
    const supabase = getSupabaseBrowserClient("coach");
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    try {
      const res = await fetch("/api/messages/threads", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const payload = await res.json();
      if (!res.ok) return;
      const threads = (payload.threads || []) as ThreadSummary[];
      setUnreadThreads(threads.filter((t) => t.unread));
    } catch {
      // silently ignore — notifications are best-effort
    }
  }

  // Load on mount + live updates via Supabase real-time
  useEffect(() => {
    loadUnread();
    const supabase = getSupabaseBrowserClient("coach");
    if (!supabase) return;
    const channel = supabase
      .channel("coach-shell-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        loadUnread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  const unreadCount = unreadThreads.length;

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--bg-void)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[var(--bg-void)]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat"
          }}
        />
        <div className="absolute -top-[20%] left-[15%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.07)_0%,transparent_70%)]" style={{ animation: "orb-drift 12s ease-in-out infinite" }} />
        <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.05)_0%,transparent_70%)]" style={{ animation: "orb-drift 16s ease-in-out infinite reverse" }} />
        <div className="absolute -bottom-[20%] left-[40%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.04)_0%,transparent_70%)]" style={{ animation: "orb-drift 20s ease-in-out infinite" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(37,99,235,0.5)] to-transparent" />
      </div>

      <aside
        style={{
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(32px) saturate(1.4)",
          borderRight: "1px solid var(--border-dim)",
          width: "220px",
          padding: "24px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50
        }}
        className="hidden h-full overflow-y-auto lg:flex"
      >
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-accent)] bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(37,99,235,0.04))] shadow-[0_0_26px_rgba(37,99,235,0.16)]">
            <span className="font-display text-lg font-bold tracking-[-0.08em] text-white">H</span>
          </div>
          <div>
            <p className="card-eyebrow">Heimdallfit</p>
            <p className="mt-1 text-sm font-semibold text-white">Coach OS</p>
          </div>
        </div>

        <div className="mb-2 px-2">
          <p className="card-eyebrow">Main Menu</p>
        </div>
        <nav className="space-y-1">
          {coachNav.map(({ href, label, icon: Icon }) => (
            <SidebarLink key={label} href={href} label={label} icon={Icon} active={activeNav.label === label} />
          ))}
        </nav>

        <a
          href="/coach/onboarding"
          className="group mt-auto overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(37,99,235,0.10),rgba(37,99,235,0.02))] p-4 transition-all duration-300 hover:border-[var(--border-accent)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.32),0_0_0_1px_rgba(37,99,235,0.16)]"
        >
          <div className="pointer-events-none absolute inset-x-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.14),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
          <p className="card-eyebrow">Onboard Client</p>
          <h3 className="mt-3 max-w-[140px] font-display text-[1.4rem] font-semibold leading-[0.95] text-white">
            Open a new room entry
          </h3>
          <p className="mt-3 text-[13px] leading-6 text-[var(--text-secondary)]">
            Send a branded invite and drop them straight into your coaching system.
          </p>
        </a>

        <div className="mt-4 flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <div className="relative">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(37,99,235,0.35),rgba(16,185,129,0.18))] font-mono text-sm font-medium text-white">
                {initials || "C"}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-deep)] bg-[var(--green)] shadow-[0_0_10px_var(--green-glow)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white">{profile.name}</p>
            <p className="truncate text-[11px] text-[var(--text-secondary)]">{profile.handle || profile.role}</p>
          </div>
        </div>
      </aside>

      <div className="h-full lg:pl-[220px]">
        <div className="flex h-full flex-col px-4 py-4 lg:px-6 lg:py-5">
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/[0.06] shadow-[var(--shadow-panel)] backdrop-blur-xl"
            style={{ background: "var(--panel-bg)" }}
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.05] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[var(--accent-bright)]">
                  <activeNav.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <span>Coach Portal</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="truncate">{activeNav.label}</span>
                  </div>
                  <p className="truncate font-display text-[15px] font-semibold tracking-[-0.03em] text-white">{activeNav.label}</p>
                </div>
              </div>

              <label className="hidden h-9 w-full max-w-[320px] items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.035] px-4 md:flex">
                <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  placeholder="Search clients, programs, messages..."
                  className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-ghost)]"
                />
                <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-[var(--text-ghost)]">
                  ⌘K
                </span>
              </label>

              <div className="flex items-center gap-2">
                {/* Chat — links to messages, ping only when unread */}
                <HeaderButton icon={MessageCircleMore} href="/coach/messages" ping={unreadCount > 0} />

                {/* Bell — notification dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => setNotifOpen((o) => !o)}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.06] bg-white/[0.03] text-[var(--text-muted)] transition-all duration-200",
                      "hover:scale-[1.03] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-[var(--text-primary)]",
                      notifOpen && "border-white/[0.12] bg-white/[0.06] text-[var(--text-primary)]"
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--combat)] px-1 font-mono text-[9px] font-semibold text-white shadow-[0_0_0_2px_var(--bg-deep)]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-[20px] border border-white/[0.08] shadow-[var(--shadow-panel)] backdrop-blur-xl animate-scale-in" style={{ background: "var(--bg-deep)" }}>
                      {/* Header */}
                      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                        <span className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-[var(--combat)] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Thread list */}
                      {unreadThreads.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-[13px] text-[var(--text-muted)]">You're all caught up</p>
                        </div>
                      ) : (
                        <div className="max-h-[300px] overflow-y-auto py-1">
                          {unreadThreads.slice(0, 5).map((thread) => (
                            <a
                              key={thread.id}
                              href="/coach/messages"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                            >
                              {thread.counterpartAvatar ? (
                                <img
                                  src={thread.counterpartAvatar}
                                  alt={thread.counterpartName}
                                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(37,99,235,0.35),rgba(16,185,129,0.18))] font-mono text-xs font-medium text-white">
                                  {avatarInitials(thread.counterpartName)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                                    {thread.counterpartName}
                                  </span>
                                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                                    {relativeTime(thread.lastMessageAt)}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
                                  {thread.lastMessagePreview}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="border-t border-white/[0.06] px-4 py-3">
                        <a
                          href="/coach/messages"
                          onClick={() => setNotifOpen(false)}
                          className="text-[12px] font-semibold text-[var(--accent-bright)] hover:underline"
                        >
                          View all messages →
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Moon / Sun — theme toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.06] bg-white/[0.03] text-[var(--text-muted)] transition-all duration-200 hover:scale-[1.03] hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                >
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>

                <div className="ml-1 flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.035] px-2 py-1.5">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(37,99,235,0.35),rgba(16,185,129,0.20))] font-mono text-xs font-medium text-white">
                      {initials || "C"}
                    </div>
                  )}
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{profile.name}</p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">{profile.role}</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex flex-1 flex-col overflow-hidden px-5 py-5">
              <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
