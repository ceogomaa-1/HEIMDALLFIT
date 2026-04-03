"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, MessageSquareText, ShieldCheck, ShoppingBag, Sparkles, UserRound } from "lucide-react";
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

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#2b2b34] bg-[#18181f] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/62">
      {label}
    </span>
  );
}

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
          if (!joinResponse.ok) {
            throw new Error(joinPayload.error || "Unable to join this room.");
          }
          router.replace("/client");
          return;
        }

        const response = await fetch("/api/client/dashboard", {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load client dashboard.");
        }
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
        <div className="rounded-[24px] border border-[#2b2b34] bg-[#18181f] px-5 py-4 text-sm text-red-300">{error}</div>
      ) : data ? (
        <div className="flex min-h-full flex-col gap-4">
          <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
            <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5">
              <p className="text-[13px] text-white/45">Client Dashboard</p>
              <h1 className="mt-1 text-[1.9rem] font-semibold tracking-[-0.05em] text-white">
                {data.linkedCoach ? `Welcome into ${data.linkedCoach.roomName}.` : "Welcome to your client portal."}
              </h1>
              <p className="mt-2 max-w-[680px] text-[13px] text-white/45">
                {data.linkedCoach
                  ? `You are connected to ${data.linkedCoach.name}. Programs, messaging, and onboarding all live here now.`
                  : "Sign in first, then either enter a coach room ID or explore coaches on the platform to get connected."}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-[20px] border border-[#2b2b34] bg-[#202028] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Status</p>
                  <p className="mt-2 text-xl font-semibold capitalize text-white">{data.stats.membershipStatus}</p>
                </div>
                <div className="rounded-[20px] border border-[#2b2b34] bg-[#202028] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Joined</p>
                  <p className="mt-2 text-xl font-semibold text-white">{data.stats.joinedDate}</p>
                </div>
                <div className="rounded-[20px] border border-[#2b2b34] bg-[#202028] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Weight</p>
                  <p className="mt-2 text-xl font-semibold text-white">{data.stats.currentWeight}</p>
                </div>
                <div className="rounded-[20px] border border-[#2b2b34] bg-[#202028] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Assigned Plans</p>
                  <p className="mt-2 text-xl font-semibold text-white">{data.stats.assignedPrograms}</p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#202028] text-white/75">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white">Your Coach</h2>
                  <p className="text-[13px] text-white/45">The room connection that powers your onboarding and future messaging.</p>
                </div>
              </div>

              {data.linkedCoach ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-[#2b2b34] bg-[#202028]">
                  <div className="relative h-36 w-full overflow-hidden">
                    {data.linkedCoach.banner ? (
                      <img src={data.linkedCoach.banner} alt={`${data.linkedCoach.name} banner`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(110,18,18,0.32),transparent_26%),linear-gradient(135deg,#17171d,#24242c)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#17171d] to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-end gap-3">
                      {data.linkedCoach.avatar ? (
                        <img src={data.linkedCoach.avatar} alt={data.linkedCoach.name} className="h-14 w-14 rounded-full border-4 border-[#17171d] object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#17171d] bg-white text-sm font-semibold text-black">
                          {data.linkedCoach.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() || "")
                            .join("")}
                        </div>
                      )}
                      <div>
                        <p className="text-xl font-semibold text-white">{data.linkedCoach.name}</p>
                        <p className="text-sm text-white/60">{data.linkedCoach.specialty}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-4 text-sm text-white/62">
                    <p>{data.linkedCoach.bio}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] border border-[#2b2b34] bg-[#18181f] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/28">Room ID</p>
                        <p className="mt-1 font-semibold text-white">{data.linkedCoach.roomId}</p>
                      </div>
                      <div className="rounded-[18px] border border-[#2b2b34] bg-[#18181f] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/28">Tagline</p>
                        <p className="mt-1 font-semibold text-white">{data.linkedCoach.tagline}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[22px] border border-[#2b2b34] bg-[#202028] p-5">
                  <p className="text-sm text-white/55">No coach linked yet. Open <span className="font-semibold text-white">Find your coach</span> from the side menu or use your coach room ID to join directly.</p>
                </div>
              )}
            </GlassPanel>
          </section>

          <section className="grid flex-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#202028] text-white/75">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white">Client Signals</h2>
                  <p className="text-[13px] text-white/45">What matters most right now in your room relationship.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {data.notifications.map((item) => (
                  <div key={item} className="rounded-[20px] border border-[#2b2b34] bg-[#202028] px-4 py-4 text-sm text-white/68">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[22px] border border-[#2b2b34] bg-[#202028] p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">What comes next</p>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  Your HEIMDALLFIT messaging system will live here next, replacing the usual back-and-forth across other apps. This dashboard is being structured around that.
                </p>
              </div>
            </GlassPanel>

            <div className="grid gap-4">
              <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#202028] text-white/75">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white">Assigned Programs</h2>
                    <p className="text-[13px] text-white/45">Programs already attached to your client record.</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {data.programs.length ? (
                    data.programs.map((program) => (
                      <div key={program.id} className="rounded-[20px] border border-[#2b2b34] bg-[#202028] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{program.title}</p>
                            <p className="mt-1 text-xs text-white/42">{program.sport}</p>
                          </div>
                          <StatusBadge label={program.createdAt} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-[#2b2b34] bg-[#202028] px-4 py-6 text-sm text-white/50">
                      No programs assigned yet. Once your coach builds one for you, it will appear here.
                    </div>
                  )}
                </div>
              </GlassPanel>

              <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#202028] text-white/75">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white">Coach Store</h2>
                    <p className="text-[13px] text-white/45">Products your coach has already published for clients.</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.store.length ? (
                    data.store.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-[22px] border border-[#2b2b34] bg-[#202028]">
                        <div className="h-28 w-full overflow-hidden bg-[#18181f]">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.22em] text-white/25">{item.type}</div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-xs leading-6 text-white/42">{item.subtitle}</p>
                          <p className="mt-3 text-sm font-semibold text-white">{item.priceLabel}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-[#2b2b34] bg-[#202028] px-4 py-6 text-sm text-white/50 sm:col-span-2">
                      No products are published in your coach store yet.
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
