"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  MessageSquare,
  Search,
  UserRoundPlus,
  Users
} from "lucide-react";
import { CoachShell } from "../../components/coach-shell";
import { GlassPanel } from "../../components/glass";
import { MorphingSquare } from "../../components/ui/morphing-square";
import { GlowCard } from "../../components/ui/spotlight-card";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";
import type { CoachDashboardResponse } from "../../lib/coach-dashboard-types";

function MiniTrend({
  data,
  color = "#45d483"
}: {
  data: number[];
  color?: string;
}) {
  const safeData = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safeData, 1);

  const points = safeData
    .map((value, index) => {
      const x = (index / Math.max(safeData.length - 1, 1)) * 100;
      const normalized = max === 0 ? 50 : (value / max) * 80 + 10;
      const y = 100 - normalized;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative h-[180px] overflow-hidden rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4">
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 opacity-20">
        {Array.from({ length: 30 }).map((_, index) => (
          <div key={index} className="border-b border-r border-white/7" />
        ))}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`fill-${color}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill={`url(#fill-${color})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.35" />
      </svg>
    </div>
  );
}

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
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load dashboard.");
        }

        if (!active) return;
        setDashboard(payload);
        setError(null);
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

  return (
    <CoachShell profile={profile}>
      <div className="flex min-h-full flex-col gap-4 pb-4">
        <section className="flex flex-col gap-3 border-b border-[#232329] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[13px] text-white/45">Good morning</p>
            <h1 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.05em] text-white">Welcome Back !</h1>
            {dashboard?.profile.roomId ? (
              <p className="mt-2 text-[12px] text-white/38">
                Room ID: <span className="font-medium text-white/72">{dashboard.profile.roomId}</span>
              </p>
            ) : null}
          </div>

          <label className="flex w-full max-w-[320px] items-center gap-3 rounded-full border border-[#282830] bg-[#15151b] px-4 py-2.5 text-[13px] text-white/35">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients..."
              className="w-full bg-transparent text-white outline-none placeholder:text-white/35"
            />
          </label>
        </section>

        {error ? (
          <GlassPanel className="border-[#402226] bg-[#1a1214] p-4 text-sm text-red-200">{error}</GlassPanel>
        ) : null}

        <section className="grid gap-3 xl:grid-cols-[1.08fr_0.86fr_0.9fr]">
          <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-4">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[13px] text-white/48">Total Revenue</p>
                <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em]">
                  {currency(dashboard?.metrics.monthlyRevenue || 0)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a3b2d] text-[#53d78e]">
                <CircleDollarSign className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex h-[128px] w-[128px] items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#43d07f 0deg, #43d07f ${((dashboard?.metrics.paidOrderRate || 0) / 100) * 360}deg, rgba(255,255,255,0.1) ${((dashboard?.metrics.paidOrderRate || 0) / 100) * 360}deg, rgba(255,255,255,0.08) 360deg)`
                  }}
                />
                <div className="absolute inset-[14px] rounded-full bg-[#15151b]" />
                <div className="relative text-center">
                  <p className="text-[1.55rem] font-semibold">{dashboard?.metrics.paidOrderRate || 0}%</p>
                  <p className="mt-1 text-[11px] text-white/45">Paid order rate</p>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                {(dashboard?.metrics.revenueBreakdown || []).map((item, index) => (
                  <div key={item.label} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          index === 0 ? "bg-[#43d07f]" : index === 1 ? "bg-white/45" : "bg-white/20"
                        }`}
                      />
                      <span className="text-white/65">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p>{item.share}%</p>
                      <p className="text-[11px] text-white/35">{currency(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <a
              href="/coach#store"
              className="mt-4 block w-full rounded-[14px] border border-[#31313a] bg-[#222228] px-4 py-2.5 text-center text-[13px] text-white/75 transition hover:bg-[#27272f]"
            >
              View store revenue
            </a>
          </GlassPanel>

          <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-white/48">Clients Overview</p>
                <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em]">Overview</h2>
              </div>
              <Users className="h-4 w-4 text-white/32" />
            </div>

            <div className="mt-4">
              <MiniTrend data={dashboard?.metrics.clientOverviewTrend || []} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[
                { label: "Current", value: String(dashboard?.metrics.activeMembers || 0), tone: "text-white" },
                {
                  label: "Average",
                  value: String(dashboard?.metrics.averageActiveMembers || 0),
                  tone: "text-white/62"
                },
                { label: "Max", value: String(dashboard?.metrics.maxActiveMembers || 0), tone: "text-[#4dd78a]" }
              ].map((item) => (
                <div key={item.label} className="rounded-[16px] border border-[#2b2b34] bg-[#202028] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{item.label}</p>
                  <p className={`mt-2 text-base font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-white/48">Your Status</p>
                <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em]">At a glance</h2>
              </div>
              <CalendarDays className="h-4 w-4 text-white/28" />
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                {
                  label: "Active Members",
                  meta: "Across all active plans",
                  value: String(dashboard?.metrics.activeMembers || 0),
                  tone: "text-[#53d78e]"
                },
                {
                  label: "Plans Made",
                  meta: "Month / Week / Today",
                  value: `${dashboard?.metrics.plansMonth || 0} / ${dashboard?.metrics.plansWeek || 0} / ${dashboard?.metrics.plansToday || 0}`,
                  tone: "text-white"
                },
                {
                  label: "Today",
                  meta: `${torontoNow.time} Toronto`,
                  value: torontoNow.date,
                  tone: "text-white"
                }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-[#2b2b34] bg-[#202028] px-3.5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{item.label}</p>
                    <p className="mt-1 text-[11px] text-white/42">{item.meta}</p>
                  </div>
                  <div className={`text-right text-base font-semibold ${item.tone}`}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-[16px] border border-[#2b2b34] bg-[#18181f] px-3.5 py-3 text-[12px] text-white/48">
              Pending joins waiting for action: <span className="font-medium text-white/78">{dashboard?.metrics.pendingJoins || 0}</span>
            </div>
          </GlassPanel>
        </section>

        <section>
          <div className="grid gap-3 xl:grid-cols-[1.68fr_0.82fr]">
            <GlassPanel className="flex min-h-[520px] flex-col overflow-hidden border-[#24242b] bg-[#1a1a20] p-4" id="clients">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em]">Clients Overview</h2>
                  <p className="mt-1 text-[13px] text-white/45">
                    Track membership details, activity status, and fast communication.
                  </p>
                </div>
                <a
                  href="/coach/onboarding"
                  className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[#2b2b34] bg-[#202028] text-white/52"
                >
                  <UserRoundPlus className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-4 grid auto-rows-min gap-2.5 lg:grid-cols-2">
                {loading ? (
                  <div className="col-span-full rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-8">
                    <MorphingSquare message="Loading your live clients..." />
                  </div>
                ) : filteredClients.length ? (
                  filteredClients.map((client) => (
                    <GlowCard key={client.id} glowColor={client.status === "inactive" ? "orange" : "green"} className="rounded-[18px]">
                      <div className="rounded-[18px] bg-[#202028] p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-black">
                              {client.initials}
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold">{client.name}</p>
                              <p className="mt-0.5 text-[11px] text-white/40">Date joined: {client.dateJoined}</p>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${
                              client.status === "inactive" ? "bg-amber-400/15 text-amber-300" : "bg-[#1a3b2d] text-[#5de498]"
                            }`}
                          >
                            {client.status}
                          </span>
                        </div>

                        <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-[11px] text-white/62">
                          <div className="rounded-[14px] border border-[#2d2d36] bg-[#24242c] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/28">Expire Date</p>
                            <p className="mt-1 text-[13px] text-white">{client.expireDate}</p>
                          </div>
                          <div className="rounded-[14px] border border-[#2d2d36] bg-[#24242c] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/28">Last Visited</p>
                            <p className="mt-1 text-[13px] text-white">{client.lastSeen}</p>
                          </div>
                          <div className="rounded-[14px] border border-[#2d2d36] bg-[#24242c] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/28">Age</p>
                            <p className="mt-1 text-[13px] text-white">{client.age}</p>
                          </div>
                          <div className="rounded-[14px] border border-[#2d2d36] bg-[#24242c] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/28">Weight</p>
                            <p className="mt-1 text-[13px] text-white">{client.weight}</p>
                          </div>
                        </div>

                        <div className="mt-3.5 flex items-center justify-between border-t border-[#2d2d36] pt-3">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.18em] text-white/28">Profile completeness</p>
                            <p className="mt-1 text-[13px] text-white">{client.profileCompleteness}%</p>
                          </div>
                          {client.email ? (
                            <a
                              href={`mailto:${client.email}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2d2d36] bg-[#26262e] text-white/70 transition hover:bg-[#2a2a33]"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          ) : (
                            <button
                              disabled
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2d2d36] bg-[#26262e] text-white/30"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </GlowCard>
                  ))
                ) : (
                  <div className="col-span-full rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-6 text-sm text-white/48">
                    {search
                      ? "No clients match that search yet."
                      : "No real clients yet. Start by onboarding a new client and they’ll appear here automatically."}
                  </div>
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="flex min-h-[520px] flex-col overflow-hidden border-[#24242b] bg-[#1a1a20] p-4" id="store">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em]">Your Digital Store</h2>
                  <p className="mt-1 text-[13px] text-white/45">
                    Preview what your clients can buy directly from your room.
                  </p>
                </div>
                <a className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2b2b34] bg-[#202028] text-white/60" href="/coach#store">
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-4 flex-1 space-y-2.5">
                {loading ? (
                  <div className="rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-8">
                    <MorphingSquare message="Loading live products..." />
                  </div>
                ) : dashboard?.store.length ? (
                  dashboard.store.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-[18px] border border-[#2b2b34] bg-[#202028]">
                      <div className="h-[140px] w-full overflow-hidden bg-[linear-gradient(135deg,#18181f,#23232a)]">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-end justify-between px-4 py-4 text-white/55">
                            <span className="text-[11px] uppercase tracking-[0.22em]">{item.type}</span>
                            <span className="text-xl font-semibold text-white/18">{item.title}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-3 px-3.5 py-3.5">
                        <div>
                          <p className="text-[15px] font-semibold">{item.title}</p>
                          <p className="mt-1 text-[11px] text-white/45">{item.subtitle}</p>
                        </div>
                        <span className="rounded-full border border-[#31313a] bg-[#26262e] px-3 py-1 text-[11px] text-white/70">
                          {item.priceLabel}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-6 text-sm text-white/48">
                    No live products yet. Add your first store item and it will show up here automatically.
                  </div>
                )}
              </div>
            </GlassPanel>
          </div>
        </section>
      </div>
    </CoachShell>
  );
}
