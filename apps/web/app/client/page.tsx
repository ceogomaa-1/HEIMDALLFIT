"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, MessageSquareText, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { ClientShell } from "../../components/client-shell";
import { GlassPanel } from "../../components/glass";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";
import { useCountUp } from "../../lib/use-count-up";
import { useTilt } from "../../lib/use-tilt";

type ClientDashboardResponse = {
  profile: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatar: string | null;
  };
  linkedCoach: {
    name: string;
    specialty: string;
    bio: string;
    avatar: string | null;
    banner: string | null;
    roomId: string;
    roomName: string;
    tagline: string;
  } | null;
  stats: {
    membershipStatus: string;
    joinedDate: string;
    currentWeight: string;
    assignedPrograms: number;
    storeItems: number;
  };
  programs: Array<{
    id: string;
    title: string;
    sport: string;
    createdAt: string;
  }>;
  store: Array<{
    id: string;
    title: string;
    subtitle: string;
    priceLabel: string;
    image: string | null;
    type: string;
  }>;
  notifications: string[];
};

function Speedometer({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const current = useCountUp(value);

  return (
    <div className="animate-scale-in flex flex-col items-center gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-4 py-5">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90">
          <circle cx="26" cy="26" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
          <circle
            cx="26"
            cy="26"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)", filter: "drop-shadow(0 0 6px currentColor)" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] font-semibold text-white">{current}</span>
      </div>
      <p className="card-eyebrow text-center">{label}</p>
    </div>
  );
}

function ProgramCard({
  title,
  sport,
  createdAt
}: {
  title: string;
  sport: string;
  createdAt: string;
}) {
  const tilt = useTilt(4);
  const sportKey = sport.toLowerCase();
  const sportStyle = sportKey.includes("boxing")
    ? "from-[rgba(239,68,68,0.85)] to-[rgba(239,68,68,0.25)]"
    : sportKey.includes("mma")
      ? "from-[rgba(245,158,11,0.85)] to-[rgba(245,158,11,0.25)]"
      : sportKey.includes("bjj")
        ? "from-[rgba(37,99,235,0.85)] to-[rgba(37,99,235,0.25)]"
        : "from-[rgba(37,99,235,0.85)] to-[rgba(16,185,129,0.25)]";

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="animate-slide-up overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(12,12,20,0.95),rgba(8,8,14,0.98))] shadow-[var(--shadow-card)]"
    >
      <div className={`h-3 bg-gradient-to-r ${sportStyle}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="card-eyebrow text-[var(--accent-bright)]">{sport}</p>
            <h3 className="mt-3 font-display text-[18px] font-semibold tracking-[-0.04em] text-white">{title}</h3>
          </div>
          <span className="rounded-full border border-[var(--border-accent)] bg-[var(--accent-dim)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--accent-bright)]">
            {createdAt}
          </span>
        </div>
        <button className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-accent)] bg-[var(--accent-dim)] px-4 py-2 text-[13px] font-semibold text-[var(--accent-bright)] transition hover:bg-[rgba(37,99,235,0.16)]">
          Start
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StoreCard({
  title,
  subtitle,
  priceLabel,
  image,
  type
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  image: string | null;
  type: string;
}) {
  const tilt = useTilt(4);

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="animate-slide-up overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(12,12,20,0.95),rgba(8,8,14,0.98))] shadow-[var(--shadow-card)]"
    >
      <div className="group relative h-36 overflow-hidden bg-[linear-gradient(135deg,#12151d,#191d28)]">
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="card-eyebrow">{type}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="p-5">
        <h3 className="font-display text-[18px] font-semibold tracking-[-0.04em] text-white">{title}</h3>
        <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">{subtitle}</p>
        <span className="mt-4 inline-block rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.12)] px-3 py-1.5 font-mono text-[12px] font-semibold text-[var(--green)]">
          {priceLabel}
        </span>
      </div>
    </div>
  );
}

function ClientDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdParam = searchParams.get("roomId");
  const supabase = useMemo(() => getSupabaseBrowserClient("client"), []);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClientDashboardResponse | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for the client portal.");
        setLoading(false);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/client/auth?next=%2Fclient");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if ((profile as { role?: string } | null)?.role === "coach") {
        await supabase.auth.signOut();
        router.replace("/client/auth?next=%2Fclient");
        return;
      }

      try {
        if (roomIdParam) {
          setJoining(true);
          const joinResponse = await fetch("/api/client/join-room", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ roomId: roomIdParam })
          });
          const joinPayload = await joinResponse.json();
          if (!joinResponse.ok) throw new Error(joinPayload.error || "Unable to join this room.");
          router.replace("/client");
          return;
        }

        const response = await fetch("/api/client/dashboard", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load client dashboard.");
        if (!active) return;
        setData(payload);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load client dashboard.");
      } finally {
        if (active) {
          setJoining(false);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [roomIdParam, router, supabase]);

  const shellProfile = data?.profile || {
    name: loading ? "Loading client..." : "Client",
    handle: "@client",
    role: "Client",
    avatar: null
  };

  const programsValue = useCountUp(data?.stats.assignedPrograms || 0);
  const storeValue = useCountUp(data?.stats.storeItems || 0);
  const weightValue = useCountUp(Number.parseInt((data?.stats.currentWeight || "0").replace(/\D/g, ""), 10) || 0);

  return (
    <ClientShell profile={shellProfile}>
      {loading || joining ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="skeleton h-4 w-32" />
            <div className="mt-4 skeleton h-14 w-[70%]" />
            <div className="mt-6 flex gap-3">
              <div className="skeleton h-10 w-28 rounded-full" />
              <div className="skeleton h-10 w-28 rounded-full" />
            </div>
          </div>
          <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="skeleton h-28 w-full rounded-[18px]" />
          </div>
        </div>
      ) : error ? (
        <GlassPanel className="px-5 py-4 text-sm text-red-200" style={{ background: "rgba(38,11,17,0.8)", borderColor: "rgba(239,68,68,0.22)" }}>
          {error}
        </GlassPanel>
      ) : data ? (
        <div className="page-enter flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <GlassPanel className="overflow-hidden p-0">
              <div className="p-6">
                <p className="card-eyebrow text-[var(--accent-bright)]">Client HQ</p>
                <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,3.6rem)] font-bold leading-[0.95] tracking-[-0.07em] text-white">
                  Welcome back, {data.profile.name.split(" ")[0]}.
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.12)] px-4 py-2 text-[14px] font-semibold text-[var(--green-bright)]">
                    {data.stats.membershipStatus}
                  </span>
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {data.stats.currentWeight}
                  </span>
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    Joined {data.stats.joinedDate}
                  </span>
                </div>
              </div>
              <div className="border-t border-white/[0.06] px-6 py-5">
                {data.linkedCoach ? (
                  <div className="flex flex-col gap-4 rounded-[20px] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(37,99,235,0.10),rgba(255,255,255,0.02))] p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      {data.linkedCoach.avatar ? (
                        <img src={data.linkedCoach.avatar} alt={data.linkedCoach.name} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(37,99,235,0.45),rgba(16,185,129,0.18))] font-mono text-sm font-medium text-white">
                          {data.linkedCoach.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() || "")
                            .join("")}
                        </div>
                      )}
                      <div>
                        <p className="font-display text-[20px] font-semibold tracking-[-0.04em] text-white">{data.linkedCoach.name}</p>
                        <p className="text-[13px] text-[var(--text-secondary)]">{data.linkedCoach.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-[var(--border-accent)] bg-[var(--accent-dim)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent-bright)]">
                        Room {data.linkedCoach.roomId}
                      </span>
                      <a href="/client/messages" className="btn-primary inline-flex items-center gap-2 px-4 py-3 text-[13px]">
                        <MessageSquareText className="h-4 w-4" />
                        Message Coach
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
                    <div className="text-3xl opacity-25 grayscale">◎</div>
                    <p className="mx-auto mt-3 max-w-[320px] text-sm leading-7 text-[var(--text-ghost)]">
                      No coach linked yet. Open <span className="font-semibold text-white">Find your coach</span> from the side menu or use your room code to connect.
                    </p>
                  </div>
                )}
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[var(--accent-bright)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="card-eyebrow">Signals</p>
                  <h2 className="mt-2 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">Your performance pulse</h2>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Speedometer label="Programs" value={programsValue} max={10} color="#2563EB" />
                <Speedometer label="Store" value={storeValue} max={10} color="#10B981" />
                <Speedometer label="Weight" value={weightValue} max={250} color="#F59E0B" />
                <Speedometer label="Coach Link" value={data.linkedCoach ? 100 : 0} max={100} color="#EF4444" />
              </div>
            </GlassPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <GlassPanel className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white/75">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="card-eyebrow">Assigned Programs</p>
                  <h2 className="mt-2 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">Training stack</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {data.programs.length ? (
                  data.programs.map((program) => (
                    <ProgramCard key={program.id} title={program.title} sport={program.sport} createdAt={program.createdAt} />
                  ))
                ) : (
                  <div className="md:col-span-2 rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
                    <div className="text-3xl opacity-25 grayscale">◎</div>
                    <p className="mx-auto mt-3 max-w-[280px] text-sm leading-7 text-[var(--text-ghost)]">
                      No programs assigned yet. Once your coach builds one for you, it will appear here.
                    </p>
                  </div>
                )}
              </div>
            </GlassPanel>

            <div className="grid gap-4">
              <GlassPanel className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white/75">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="card-eyebrow">Room Signals</p>
                    <h2 className="mt-2 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">What matters now</h2>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {data.notifications.map((item, index) => (
                    <div key={item} className={`animate-slide-up rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-[14px] leading-7 text-[var(--text-secondary)] stagger-${Math.min(index + 1, 6)}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white/75">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="card-eyebrow">Coach Store</p>
                    <h2 className="mt-2 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">Available offers</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-4">
                  {data.store.length ? (
                    data.store.map((item) => (
                      <StoreCard key={item.id} title={item.title} subtitle={item.subtitle} priceLabel={item.priceLabel} image={item.image} type={item.type} />
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
                      <div className="text-3xl opacity-25 grayscale">◎</div>
                      <p className="mx-auto mt-3 max-w-[280px] text-sm leading-7 text-[var(--text-ghost)]">
                        No products are published in your coach store yet.
                      </p>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </div>
          </section>
        </div>
      ) : null}
    </ClientShell>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={null}>
      <ClientDashboardContent />
    </Suspense>
  );
}
