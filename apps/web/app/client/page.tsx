"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquareText, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { ClientShell } from "../../components/client-shell";
import { GlassPanel } from "../../components/glass";
import { MorphingSquare } from "../../components/ui/morphing-square";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";

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

function ClientPortalContent() {
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

  return (
    <ClientShell profile={shellProfile}>
      {loading || joining ? (
        <div className="flex min-h-[520px] items-center justify-center">
          <MorphingSquare message={joining ? "Joining coach room..." : "Loading client portal..."} />
        </div>
      ) : error ? (
        <GlassPanel className="px-5 py-4 text-sm text-red-200" style={{ background: "rgba(38,11,17,0.8)", borderColor: "rgba(239,68,68,0.22)" }}>
          {error}
        </GlassPanel>
      ) : data ? (
        <div className="flex min-h-full flex-col gap-5">
          <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
            <GlassPanel className="animate-fade-up stagger-1 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">Client Dashboard</p>
              <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.02] tracking-[-0.05em] text-white">
                {data.linkedCoach ? `Welcome into ${data.linkedCoach.roomName}.` : "Welcome to your client portal."}
              </h1>
              <p className="mt-3 max-w-[700px] text-[14px] leading-7 text-[var(--text-secondary)]">
                {data.linkedCoach
                  ? `You are connected to ${data.linkedCoach.name}. Programs, messaging, and onboarding all live here now.`
                  : "Sign in first, then either enter a coach room ID or explore coaches on the platform to get connected."}
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {[
                  ["Status", data.stats.membershipStatus],
                  ["Joined", data.stats.joinedDate],
                  ["Weight", data.stats.currentWeight],
                  ["Assigned Plans", String(data.stats.assignedPrograms)]
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: "18px",
                      padding: "16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)"
                    }}
                    className={`animate-scale-in transition-all duration-200 hover:-translate-y-[2px] hover:bg-white/[0.05] stagger-${Math.min(index + 1, 6)}`}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--text-ghost)]">{label}</p>
                    <p className="mt-2 font-display text-[22px] font-bold tracking-[-0.04em] text-white">{value}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="animate-fade-up stagger-2 overflow-hidden p-0">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white/75">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-[1.6rem] font-bold tracking-[-0.04em] text-white">Your Coach</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">
                      The room connection that powers your onboarding and future messaging.
                    </p>
                  </div>
                </div>
              </div>

              {data.linkedCoach ? (
                <div className="mx-6 mb-6 overflow-hidden rounded-[22px] border border-white/[0.07] bg-[rgba(12,12,20,0.9)]">
                  <div
                    style={{
                      height: "140px",
                      position: "relative",
                      overflow: "hidden",
                      background: data.linkedCoach.banner
                        ? undefined
                        : "radial-gradient(ellipse at 20% 50%, rgba(0,163,255,0.15), transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(67,208,127,0.10), transparent 60%), rgba(12,12,20,1)",
                      animation: data.linkedCoach.banner ? undefined : "orb-drift 10s ease-in-out infinite"
                    }}
                  >
                    {data.linkedCoach.banner ? (
                      <img src={data.linkedCoach.banner} alt={`${data.linkedCoach.name} banner`} className="h-full w-full object-cover" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101117] via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-end gap-4">
                      {data.linkedCoach.avatar ? (
                        <img src={data.linkedCoach.avatar} alt={data.linkedCoach.name} className="h-16 w-16 rounded-full border-[3px] border-[#101117] object-cover shadow-[0_0_20px_rgba(0,163,255,0.25)]" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[rgba(0,163,255,0.5)] bg-[linear-gradient(135deg,rgba(0,163,255,0.3),rgba(67,208,127,0.2))] font-mono text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,163,255,0.3)]">
                          {data.linkedCoach.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() || "")
                            .join("")}
                        </div>
                      )}
                      <div className="pb-1">
                        <p className="font-display text-[20px] font-bold text-white">{data.linkedCoach.name}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{data.linkedCoach.specialty}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 p-4 text-sm text-[var(--text-secondary)]">
                    <p className="leading-7">{data.linkedCoach.bio}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-ghost)]">Room ID</p>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background: "rgba(0,163,255,0.10)",
                            border: "1px solid rgba(0,163,255,0.20)",
                            fontSize: "11px",
                            color: "var(--accent)",
                            marginTop: "10px"
                          }}
                          className="font-mono"
                        >
                          {data.linkedCoach.roomId}
                        </div>
                      </div>
                      <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-ghost)]">Tagline</p>
                        <p className="mt-3 font-medium text-white">{data.linkedCoach.tagline}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-6 mb-6 rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
                  <div className="text-3xl opacity-25 grayscale">◎</div>
                  <p className="mx-auto mt-3 max-w-[320px] text-sm leading-7 text-[var(--text-ghost)]">
                    No coach linked yet. Open <span className="font-semibold text-white">Find your coach</span> from the side menu or use your coach room ID to join directly.
                  </p>
                </div>
              )}
            </GlassPanel>
          </section>

          <section className="grid flex-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <GlassPanel className="animate-fade-up stagger-3 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white/75">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-[1.6rem] font-bold tracking-[-0.04em] text-white">Client Signals</h2>
                  <p className="text-[13px] text-[var(--text-secondary)]">What matters most right now in your room relationship.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {data.notifications.map((item, index) => (
                  <div
                    key={item}
                    className={`animate-fade-up rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-sm text-[var(--text-secondary)] stagger-${Math.min(index + 1, 6)}`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-ghost)]">What comes next</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  Your HEIMDALLFIT messaging system lives here to replace the back-and-forth across other apps. This portal is now structured around one continuous coach-client relationship.
                </p>
              </div>
            </GlassPanel>

            <div className="grid gap-4">
              <GlassPanel className="animate-fade-up stagger-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white/75">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-[1.6rem] font-bold tracking-[-0.04em] text-white">Assigned Programs</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">Programs already attached to your client record.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {data.programs.length ? (
                    data.programs.map((program, index) => (
                      <div
                        key={program.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 16px",
                          borderRadius: "16px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          cursor: "pointer"
                        }}
                        className={`animate-fade-up mb-2 transition-all duration-200 hover:translate-x-[3px] hover:border-white/10 hover:bg-white/[0.05] stagger-${Math.min(index + 1, 6)}`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{program.title}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{program.sport}</p>
                        </div>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontSize: "9px",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            background: "rgba(0,163,255,0.10)",
                            color: "var(--accent)",
                            border: "1px solid rgba(0,163,255,0.20)"
                          }}
                          className="font-mono"
                        >
                          {program.createdAt}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
                      <div className="text-3xl opacity-25 grayscale">◎</div>
                      <p className="mx-auto mt-3 max-w-[280px] text-sm leading-7 text-[var(--text-ghost)]">
                        No programs assigned yet. Once your coach builds one for you, it will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </GlassPanel>

              <GlassPanel className="animate-fade-up stagger-5 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white/75">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-[1.6rem] font-bold tracking-[-0.04em] text-white">Coach Store</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">Products your coach has already published for clients.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {data.store.length ? (
                    data.store.map((item, index) => (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[rgba(12,12,20,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                        style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${Math.min(index, 6) * 0.05}s` }}
                      >
                        <div className="group relative h-32 overflow-hidden bg-[#0f121a]">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.22em] text-white/25">{item.type}</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{item.subtitle}</p>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 14px",
                              borderRadius: "20px",
                              background: "rgba(67,208,127,0.12)",
                              border: "1px solid rgba(67,208,127,0.25)",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "var(--green)",
                              marginTop: "14px"
                            }}
                            className="font-mono"
                          >
                            {item.priceLabel}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center sm:col-span-2">
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
      <ClientPortalContent />
    </Suspense>
  );
}
