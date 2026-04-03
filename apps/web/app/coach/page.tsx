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
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";
import type { CoachDashboardResponse } from "../../lib/coach-dashboard-types";

function MiniTrend({ data, color = "#43D07F" }: { data: number[]; color?: string }) {
  const safeData = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safeData, 1);
  const points = safeData
    .map((value, index) => {
      const x = (index / Math.max(safeData.length - 1, 1)) * 100;
      const normalized = max === 0 ? 50 : (value / max) * 82 + 8;
      const y = 100 - normalized;
      return `${x},${y}`;
    })
    .join(" ");
  const lastIndex = safeData.length - 1;
  const lastX = (lastIndex / Math.max(safeData.length - 1, 1)) * 100;
  const lastY = 100 - (max === 0 ? 50 : (safeData[lastIndex] / max) * 82 + 8);

  return (
    <div className="relative h-[190px] overflow-hidden rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 opacity-40">
        {Array.from({ length: 30 }).map((_, index) => (
          <div key={index} className="border-b border-r border-white/[0.04]" />
        ))}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`trend-fill-${color}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill={`url(#trend-fill-${color})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          style={{ filter: "drop-shadow(0 2px 6px rgba(69,212,131,0.55))" }}
        />
        <circle
          cx={lastX}
          cy={lastY}
          r="3"
          fill={color}
          style={{ filter: "drop-shadow(0 0 5px #45d483)", animation: "pulseGlow 2s ease infinite" }}
        />
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
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");
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
      <div className="flex min-h-full flex-col gap-5 pb-4">
        <section className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="animate-fade-up">
            <p
              style={{
                fontSize: "12px",
                letterSpacing: "0.2em",
                color: "var(--accent)",
                textTransform: "uppercase",
                marginBottom: "8px"
              }}
              className="font-mono"
            >
              Good morning
            </p>
            <h1
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                color: "var(--text-primary)"
              }}
              className="font-display"
            >
              Welcome back, {profile.name.split(" ")[0]}.
            </h1>
            {dashboard?.profile.roomId ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "10px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: "11px",
                  color: "var(--text-muted)"
                }}
                className="font-mono"
              >
                <span style={{ color: "var(--accent)", opacity: 0.7 }}>◈</span>
                Room {dashboard.profile.roomId}
              </div>
            ) : null}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "10px 16px",
              width: "280px",
              transition: "all 0.25s"
            }}
            className="w-full max-w-[320px] focus-within:border-[rgba(0,163,255,0.35)] focus-within:shadow-[0_0_0_3px_rgba(0,163,255,0.08)]"
          >
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-ghost)]"
            />
          </label>
        </section>

        {error ? (
          <GlassPanel className="px-5 py-4 text-sm text-red-200" style={{ background: "rgba(38,11,17,0.8)", borderColor: "rgba(239,68,68,0.22)" }}>
            {error}
          </GlassPanel>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.08fr_0.86fr_0.9fr]">
          <GlassPanel className="animate-fade-up stagger-1 p-6">
            <div
              style={{
                position: "absolute",
                top: "-30px",
                right: "-30px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,163,255,0.10) 0%, transparent 70%)",
                pointerEvents: "none"
              }}
            />
            <div className="relative flex items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-ghost)]">Total Revenue</p>
                <p className="mt-2 font-display text-[2.2rem] font-bold tracking-[-0.05em] text-white">
                  {currency(dashboard?.metrics.monthlyRevenue || 0)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-[var(--green)]">↑ +12.4% this month</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
                <CircleDollarSign className="h-4 w-4" />
              </div>
            </div>

            <div className="relative mt-5 flex items-center gap-5">
              <div className="relative flex h-[148px] w-[148px] items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#43d07f 0deg, #43d07f ${((dashboard?.metrics.paidOrderRate || 0) / 100) * 360}deg, rgba(255,255,255,0.08) ${((dashboard?.metrics.paidOrderRate || 0) / 100) * 360}deg, rgba(255,255,255,0.04) 360deg)`,
                    filter: "drop-shadow(0 0 6px rgba(67,208,127,0.6))"
                  }}
                />
                <div className="absolute inset-[16px] rounded-full bg-[var(--bg-deep)]" />
                <div className="relative text-center">
                  <p className="font-display text-[2rem] font-bold text-white">{dashboard?.metrics.paidOrderRate || 0}%</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">Paid order rate</p>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                {(dashboard?.metrics.revenueBreakdown || []).map((item, index) => (
                  <div key={item.label} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          index === 0 ? "bg-[var(--accent)]" : index === 1 ? "bg-[var(--green)]" : "bg-white/20"
                        }`}
                      />
                      <span className="text-[var(--text-secondary)]">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{item.share}%</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{currency(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="animate-fade-up stagger-2 p-6">
            <div
              style={{
                position: "absolute",
                top: "-30px",
                right: "-30px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(67,208,127,0.10) 0%, transparent 70%)",
                pointerEvents: "none"
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-ghost)]">Clients Overview</p>
                <h2 className="mt-2 font-display text-[2rem] font-bold tracking-[-0.04em] text-white">Overview</h2>
                <p className="mt-1 text-xs text-[var(--green)]">↑ +6.1% engagement this week</p>
              </div>
              <Users className="h-4 w-4 text-[var(--green)]" />
            </div>
            <div className="mt-5">
              <MiniTrend data={dashboard?.metrics.clientOverviewTrend || []} color="#43D07F" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[
                { label: "Current", value: String(dashboard?.metrics.activeMembers || 0), tone: "text-white" },
                { label: "Average", value: String(dashboard?.metrics.averageActiveMembers || 0), tone: "text-white/65" },
                { label: "Max", value: String(dashboard?.metrics.maxActiveMembers || 0), tone: "text-[var(--green)]" }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "14px",
                    padding: "10px 14px"
                  }}
                  className="transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-ghost)]">{item.label}</p>
                  <p className={`mt-2 text-base font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="animate-fade-up stagger-3 p-6">
            <div
              style={{
                position: "absolute",
                top: "-30px",
                right: "-30px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)",
                pointerEvents: "none"
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-ghost)]">Your Status</p>
                <h2 className="mt-2 font-display text-[2rem] font-bold tracking-[-0.04em] text-white">At a glance</h2>
              </div>
              <CalendarDays className="h-4 w-4 text-[var(--amber)]" />
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  label: "Active Members",
                  meta: "Across all active plans",
                  value: String(dashboard?.metrics.activeMembers || 0),
                  tone: "text-[var(--green)]"
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
                <div
                  key={item.label}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "14px",
                    padding: "12px 14px"
                  }}
                  className="transition-all duration-200 hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-ghost)]">{item.label}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{item.meta}</p>
                    </div>
                    <div className={`text-right text-base font-semibold ${item.tone}`}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
              Pending joins waiting for action:{" "}
              <span className="font-semibold text-white">{dashboard?.metrics.pendingJoins || 0}</span>
            </div>
          </GlassPanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.68fr_0.82fr]">
          <GlassPanel className="animate-fade-up stagger-4 p-6" id="clients">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[1.8rem] font-bold tracking-[-0.04em] text-white">Clients Overview</h2>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  Track membership details, activity status, and fast communication.
                </p>
              </div>
              <a
                href="/coach/onboarding"
                className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.03] text-white/70 transition hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
              >
                <UserRoundPlus className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-5 grid auto-rows-min gap-3 lg:grid-cols-2">
              {loading ? (
                <div className="col-span-full flex min-h-[180px] items-center justify-center rounded-[20px] border border-white/[0.06] bg-white/[0.02]">
                  <MorphingSquare message="Loading your live clients..." />
                </div>
              ) : filteredClients.length ? (
                filteredClients.map((client, index) => (
                  <div
                    key={client.id}
                    style={{
                      borderRadius: "20px",
                      background: "rgba(15,15,22,0.9)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
                      animation: "fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both",
                      animationDelay: `${Math.min(index, 6) * 0.05}s`
                    }}
                    className="hover:-translate-y-[3px] hover:border-white/14 hover:bg-[rgba(20,20,30,0.95)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            background: "linear-gradient(135deg, rgba(0,163,255,0.25), rgba(67,208,127,0.15))",
                            border: "1px solid rgba(0,163,255,0.25)",
                            color: "var(--text-primary)",
                            fontSize: "11px",
                            fontWeight: 500,
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          className="font-mono"
                        >
                          {client.initials}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-white">{client.name}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">Date joined: {client.dateJoined}</p>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "9px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          background: client.status === "inactive" ? "rgba(245,158,11,0.10)" : "rgba(67,208,127,0.12)",
                          color: client.status === "inactive" ? "var(--amber)" : "var(--green)",
                          border: `1px solid ${client.status === "inactive" ? "rgba(245,158,11,0.22)" : "rgba(67,208,127,0.25)"}`,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        className="font-mono"
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: client.status === "inactive" ? "var(--amber)" : "var(--green)",
                            animation: "pulseGlow 2s infinite"
                          }}
                        />
                        {client.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      {[
                        ["Expire Date", client.expireDate],
                        ["Last Visited", client.lastSeen],
                        ["Age", client.age],
                        ["Weight", client.weight]
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          style={{
                            background: "rgba(255,255,255,0.025)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "12px",
                            padding: "8px 12px"
                          }}
                        >
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text-ghost)]">{label}</p>
                          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text-ghost)]">Profile completeness</p>
                        <p className="mt-1 text-[13px] text-white">{client.profileCompleteness}%</p>
                      </div>
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/70 transition hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/25"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
                  <div className="text-3xl opacity-25 grayscale">◎</div>
                  <p className="max-w-[260px] text-[13px] leading-6 text-[var(--text-ghost)]">
                    {search
                      ? "No clients match that search yet."
                      : "No real clients yet. Start by onboarding a new client and they’ll appear here automatically."}
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="animate-fade-up stagger-5 p-6" id="store">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[1.8rem] font-bold tracking-[-0.04em] text-white">Your Digital Store</h2>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  Preview what your clients can buy directly from your room.
                </p>
              </div>
              <a
                className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.03] text-white/70 transition hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
                href="/coach#store"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-5 flex-1 space-y-3">
              {loading ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-[20px] border border-white/[0.06] bg-white/[0.02]">
                  <MorphingSquare message="Loading live products..." />
                </div>
              ) : dashboard?.store.length ? (
                dashboard.store.map((item, index) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[rgba(12,12,20,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                    style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${Math.min(index, 6) * 0.05}s` }}
                  >
                    <div className="group relative h-[148px] w-full overflow-hidden bg-[#111219]">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-end justify-between bg-[linear-gradient(135deg,#16171f,#23242b)] px-4 py-4 text-white/55">
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em]">{item.type}</span>
                          <span className="font-display text-2xl font-bold text-white/18">{item.title}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                    <div className="flex items-start justify-between gap-3 px-4 py-4">
                      <div>
                        <p className="text-[15px] font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{item.subtitle}</p>
                      </div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 14px",
                          borderRadius: "20px",
                          background: "rgba(67,208,127,0.12)",
                          border: "1px solid rgba(67,208,127,0.25)",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--green)"
                        }}
                        className="font-mono"
                      >
                        {item.priceLabel}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
                  <div className="text-3xl opacity-25 grayscale">◎</div>
                  <p className="max-w-[260px] text-[13px] leading-6 text-[var(--text-ghost)]">
                    No live products yet. Add your first store item and it will show up here automatically.
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>
        </section>
      </div>
    </CoachShell>
  );
}
