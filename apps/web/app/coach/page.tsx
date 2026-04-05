"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, MessageSquare, Search, Zap } from "lucide-react";
import { CoachShell } from "../../components/coach-shell";
import { GlassPanel } from "../../components/glass";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";
import type { CoachDashboardClient, CoachDashboardResponse, CoachDashboardStoreItem } from "../../lib/coach-dashboard-types";
import { cn } from "../../lib/utils";
import { useCountUp } from "../../lib/use-count-up";
import { useTilt } from "../../lib/use-tilt";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function getTorontoNow() {
  const now = new Date();
  return {
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Toronto"
    }).format(now),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Toronto"
    }).format(now)
  };
}

function TrendChart({ data, color = "#2563EB" }: { data: number[]; color?: string }) {
  const safeData = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safeData, 1);
  const path = safeData
    .map((value, index) => {
      const x = (index / Math.max(safeData.length - 1, 1)) * 100;
      const y = 100 - ((value / max) * 72 + 14);
      return `${x},${y}`;
    })
    .join(" ");
  const lastX = (safeData.length - 1) / Math.max(safeData.length - 1, 1) * 100;
  const lastY = 100 - ((safeData.at(-1) || 0) / max) * 72 - 14;

  return (
    <div className="relative h-[180px] overflow-hidden rounded-[18px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.03)" strokeWidth="0.6" />
        ))}
      </svg>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`trend-fill-${color}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${path} 100,100`} fill={`url(#trend-fill-${color})`} />
        <polyline
          points={path}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeDasharray="1000"
          style={{
            filter: "drop-shadow(0 0 6px var(--accent)) drop-shadow(0 0 12px var(--accent-dim))",
            animation: "draw-line 1.2s ease forwards"
          }}
        />
        <circle cx={lastX} cy={lastY} r="8" fill="none" stroke={color} strokeWidth="1" opacity="0.3" style={{ animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
        <circle cx={lastX} cy={lastY} r="4" fill={color} style={{ filter: "drop-shadow(0 0 6px currentColor)" }} />
      </svg>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  accent,
  icon,
  children
}: {
  label: string;
  value: string;
  change: string;
  accent: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="stat-card-premium animate-slide-up">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 72%)` }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className="card-eyebrow">{label}</span>
          <div className="mt-4 font-display text-[clamp(2.4rem,4vw,3.2rem)] font-bold leading-none tracking-[-0.06em] text-[var(--text-primary)]">
            {value}
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.12)] px-3 py-1.5 font-mono text-[11px] font-medium text-[var(--green-bright)]">
            <span>{change}</span>
            <span className="font-body text-[11px] font-medium text-[var(--text-ghost)]">vs last month</span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-[var(--accent-bright)]">
          {icon}
        </div>
      </div>
      <div className="relative mt-6">{children}</div>
    </div>
  );
}

function ClientRosterCard({ client }: { client: CoachDashboardClient }) {
  const tilt = useTilt(5);
  const active = client.status === "active";

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="animate-slide-up overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(12,12,20,0.95),rgba(8,8,14,0.98))] shadow-[var(--shadow-card)]"
      style={{ alignSelf: "start", height: "fit-content" }}
    >
      <div className={cn("h-1.5 w-full", active ? "bg-[linear-gradient(90deg,rgba(37,99,235,0.92),rgba(59,130,246,0.35))]" : "bg-[linear-gradient(90deg,rgba(245,158,11,0.92),rgba(245,158,11,0.28))]")} />
      <div className="flex items-start gap-5 px-5 py-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--bg-surface)] bg-[linear-gradient(135deg,rgba(37,99,235,0.45),rgba(16,185,129,0.18))] font-mono text-base font-medium text-white shadow-[0_0_24px_rgba(37,99,235,0.18)]">
          {client.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="truncate font-display text-[20px] font-semibold tracking-[-0.04em] text-white">{client.name}</h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.15em]",
                    active
                      ? "border border-[rgba(16,185,129,0.20)] bg-[rgba(16,185,129,0.10)] text-[var(--green-bright)]"
                      : "border border-[rgba(245,158,11,0.20)] bg-[rgba(245,158,11,0.10)] text-[var(--amber)]"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-[var(--green)] animate-pulse" : "bg-[var(--amber)]")} />
                  {client.status}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-[var(--text-secondary)]">Profile completeness {client.profileCompleteness}%</p>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-white/75 transition hover:bg-white/[0.06] hover:text-white">
                <MessageSquare className="h-4 w-4" />
              </button>
              <a href="/coach/profile" className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--accent-bright)] transition hover:gap-3">
                View Profile
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4" style={{ gridAutoRows: "auto" }}>
          {[
            ["Expire", client.expireDate],
            ["Weight", client.weight],
            ["Age", client.age],
            ["Last Seen", client.lastSeen]
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[14px] bg-white/[0.03] px-3 py-3"
              style={{ height: "auto" }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-ghost)]">{label}</p>
              <p className="mt-2 text-[13px] font-medium text-[var(--text-secondary)]">{value}</p>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreCard({ item }: { item: CoachDashboardStoreItem }) {
  const tilt = useTilt(4);
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="animate-slide-up overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(12,12,20,0.95),rgba(8,8,14,0.98))] shadow-[var(--shadow-card)] transition-transform duration-300"
    >
      <div className="group relative h-40 overflow-hidden bg-[linear-gradient(135deg,#11131a,#1a1d28)]">
        {item.image ? (
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end justify-between px-5 py-4">
            <span className="card-eyebrow">{item.type}</span>
            <span className="font-display text-4xl font-bold tracking-[-0.08em] text-white/10">{item.title.slice(0, 1)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute bottom-4 left-5 translate-y-3 text-[12px] font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          View Product
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[18px] font-semibold tracking-[-0.04em] text-white">{item.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">{item.subtitle}</p>
          </div>
          <span className="rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.12)] px-3 py-1.5 font-mono text-[12px] font-semibold text-[var(--green)]">
            {item.priceLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="stat-card-premium">
          <div className="skeleton h-3 w-28" />
          <div className="mt-5 skeleton h-12 w-32" />
          <div className="mt-4 skeleton h-8 w-40 rounded-full" />
          <div className="mt-6 skeleton h-28 w-full rounded-[18px]" />
        </div>
      ))}
    </div>
  );
}

export default function CoachPortalPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [dashboard, setDashboard] = useState<CoachDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [torontoNow, setTorontoNow] = useState(() => getTorontoNow());

  useEffect(() => {
    const interval = window.setInterval(() => setTorontoNow(getTorontoNow()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for the coach dashboard.");
        setLoading(false);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Coach session missing. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/coach/dashboard", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");
        if (!active) return;
        setDashboard(payload);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [supabase]);

  const profile = dashboard?.profile || {
    name: loading ? "Loading coach..." : "Coach",
    handle: "@coach",
    role: "Coach",
    avatar: null
  };

  const filteredClients = useMemo(() => {
    if (!dashboard) return [];
    const query = search.trim().toLowerCase();
    if (!query) return dashboard.clients;
    return dashboard.clients.filter((client) => {
      return (
        client.name.toLowerCase().includes(query) ||
        client.status.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
      );
    });
  }, [dashboard, search]);

  const revenueValue = useCountUp(dashboard?.metrics.monthlyRevenue || 0);
  const activeMembersValue = useCountUp(dashboard?.metrics.activeMembers || 0);
  const pendingValue = useCountUp(dashboard?.metrics.pendingJoins || 0);

  return (
    <CoachShell profile={profile}>
      <div className="page-enter flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-4">
        <section className="rounded-[24px] border border-white/[0.06] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.02))] px-6 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="card-eyebrow text-[var(--accent-bright)]">Coach Command Center</p>
              <h1 className="mt-3 max-w-[720px] font-display text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[0.94] tracking-[-0.07em] text-white">
                Welcome back, {profile.name.split(" ")[0]}.
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-accent)] bg-[var(--accent-dim)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent-bright)]">
                  Room {dashboard?.profile.roomId || "------"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Toronto {torontoNow.time}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {torontoNow.date}
                </span>
              </div>
            </div>

            <label className="flex h-11 w-full max-w-[340px] items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 transition-all focus-within:border-[var(--border-accent)] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients..."
                className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[var(--text-ghost)]"
              />
            </label>
          </div>
        </section>

        {error ? (
          <GlassPanel className="px-5 py-4 text-sm text-red-200" style={{ background: "rgba(38,11,17,0.8)", borderColor: "rgba(239,68,68,0.22)" }}>
            {error}
          </GlassPanel>
        ) : null}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.16fr_0.92fr_0.92fr]">
              <MetricCard label="Monthly Revenue" value={currency(revenueValue)} change="↑ +12.4%" accent="rgba(37,99,235,0.18)" icon={<Zap className="h-4 w-4" />}>
                <div className="h-[6px] overflow-hidden rounded-full">
                  <div className="flex h-full gap-1">
                    <div className="rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" style={{ flex: 0.6 }} />
                    <div className="rounded-full bg-[var(--green)]" style={{ flex: 0.3 }} />
                    <div className="rounded-full bg-white/15" style={{ flex: 0.1 }} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-[var(--text-secondary)]">
                  {(dashboard?.metrics.revenueBreakdown || []).map((item, index) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", index === 0 ? "bg-[var(--accent)]" : index === 1 ? "bg-[var(--green)]" : "bg-white/15")} />
                      <span>{item.label} {item.share}%</span>
                    </div>
                  ))}
                </div>
              </MetricCard>

              <MetricCard label="Active Clients" value={String(activeMembersValue)} change="↑ +6.1%" accent="rgba(16,185,129,0.18)" icon={<MessageSquare className="h-4 w-4" />}>
                <TrendChart data={dashboard?.metrics.clientOverviewTrend || []} color="#10B981" />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["Current", dashboard?.metrics.activeMembers || 0],
                    ["Average", dashboard?.metrics.averageActiveMembers || 0],
                    ["Max", dashboard?.metrics.maxActiveMembers || 0]
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                      <p className="card-eyebrow">{label}</p>
                      <p className="mt-2 text-[15px] font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </MetricCard>

              <MetricCard label="Operations Pulse" value={String(pendingValue)} change="↑ +2.0%" accent="rgba(245,158,11,0.18)" icon={<CalendarDays className="h-4 w-4" />}>
                <div className="space-y-3">
                  {[
                    ["Plans built", `${dashboard?.metrics.plansMonth || 0} this month`],
                    ["This week", `${dashboard?.metrics.plansWeek || 0} active builds`],
                    ["Today", `${dashboard?.metrics.plansToday || 0} actions shipped`]
                  ].map(([label, meta]) => (
                    <div key={String(label)} className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                      <p className="card-eyebrow">{label}</p>
                      <p className="mt-2 text-[14px] font-medium text-white">{meta}</p>
                    </div>
                  ))}
                </div>
              </MetricCard>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
              <GlassPanel className="animate-slide-up p-6" id="clients" style={{ alignSelf: "start" }}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="card-eyebrow">Client Roster</p>
                    <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">Your athlete board</h2>
                    <p className="mt-2 text-[14px] text-[var(--text-secondary)]">Track status, progress, and contact details in one sharp view.</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-4" style={{ alignItems: "stretch" }}>
                  {filteredClients.length ? (
                    filteredClients.map((client) => <ClientRosterCard key={client.id} client={client} />)
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
                      <div className="text-3xl opacity-25 grayscale">◎</div>
                      <p className="max-w-[300px] text-[14px] leading-7 text-[var(--text-ghost)]">
                        {search ? "No clients match that search yet." : "No real clients yet. Start by onboarding a new client and they’ll appear here automatically."}
                      </p>
                    </div>
                  )}
                </div>
              </GlassPanel>

              <GlassPanel className="animate-slide-up p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="card-eyebrow">Digital Store</p>
                    <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">Offer stack</h2>
                    <p className="mt-2 text-[14px] text-[var(--text-secondary)]">Everything clients can buy directly from your room.</p>
                  </div>
                  <a href="/coach#store" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white/75 transition hover:bg-white/[0.06] hover:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-6 space-y-4">
                  {dashboard?.store.length ? (
                    dashboard.store.map((item) => <StoreCard key={item.id} item={item} />)
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
                      <div className="text-3xl opacity-25 grayscale">◎</div>
                      <p className="max-w-[280px] text-[14px] leading-7 text-[var(--text-ghost)]">
                        No products are live yet. Add your first offer and it will show up here automatically.
                      </p>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </section>
          </>
        )}
      </div>
    </CoachShell>
  );
}
