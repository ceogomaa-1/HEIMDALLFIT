"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Search, Users } from "lucide-react";
import { ClientShell } from "../../../components/client-shell";
import { GlassPanel } from "../../../components/glass";
import { MorphingSquare } from "../../../components/ui/morphing-square";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";

type CoachCard = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  avatar: string | null;
  banner: string | null;
  roomId: string | null;
  roomName: string | null;
  activeMembers: number;
};

export default function FindCoachPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient("client"), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState({
    name: "Client",
    handle: "@client",
    role: "Client",
    avatar: null as string | null
  });
  const [coaches, setCoaches] = useState<CoachCard[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for the client portal.");
        setLoading(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/client/auth?next=%2Fclient%2Ffind-coach");
        return;
      }

      const { data: profileRole } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if ((profileRole as { role?: string } | null)?.role === "coach") {
        await supabase.auth.signOut();
        router.replace("/client/auth?next=%2Fclient%2Ffind-coach");
        return;
      }

      if (!active) return;
      setProfile({
        name:
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
          user.email?.split("@")[0] ||
          "Client",
        handle: user.email ? `@${user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@client",
        role: "Client",
        avatar: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null
      });

      try {
        const response = await fetch(`/api/client/coaches?q=${encodeURIComponent(query)}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load coaches.");
        }
        if (!active) return;
        setCoaches(payload.coaches || []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load coaches.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [query, router, supabase]);

  return (
    <ClientShell profile={profile}>
      <div className="flex min-h-full flex-col gap-4">
        <section className="flex flex-col gap-3 border-b border-[#232329] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] text-white/45">Coach discovery</p>
            <h1 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.05em] text-white">Find your coach</h1>
            <p className="mt-2 max-w-[720px] text-[13px] text-white/45">
              Explore coaches on HEIMDALLFIT, review their positioning, and join a room the moment you already have their room code.
            </p>
          </div>
          <div className="relative w-full max-w-[380px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search coaches..."
              className="w-full rounded-full border border-[#2b2b34] bg-[#18181f] py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-white/20"
            />
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[460px] items-center justify-center">
            <MorphingSquare message="Loading coaches..." />
          </div>
        ) : error ? (
          <div className="rounded-[24px] border border-[#2b2b34] bg-[#18181f] px-5 py-4 text-sm text-red-300">{error}</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {coaches.length ? (
              coaches.map((coach) => (
                <GlassPanel key={coach.id} className="overflow-hidden border-[#24242b] bg-[#1a1a20] p-0">
                  <div className="relative h-40 w-full overflow-hidden">
                    {coach.banner ? (
                      <img src={coach.banner} alt={`${coach.name} banner`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(110,18,18,0.32),transparent_28%),linear-gradient(135deg,#17171d,#24242c)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#17171d] to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-end gap-3">
                      {coach.avatar ? (
                        <img src={coach.avatar} alt={coach.name} className="h-14 w-14 rounded-full border-4 border-[#17171d] object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#17171d] bg-white text-sm font-semibold text-black">
                          {coach.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() || "")
                            .join("")}
                        </div>
                      )}
                      <div>
                        <p className="text-xl font-semibold text-white">{coach.name}</p>
                        <p className="text-sm text-white/60">{coach.specialty}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <p className="text-sm leading-7 text-white/58">{coach.bio}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Room ID</p>
                        <p className="mt-1 font-semibold text-white">{coach.roomId || "Private"}</p>
                      </div>
                      <div className="rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Active Members</p>
                        <p className="mt-1 font-semibold text-white">{coach.activeMembers}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`/join/${coach.id}`}
                        className="inline-flex items-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        View coach profile
                      </a>
                      {coach.roomId ? (
                        <a
                          href={`/client/auth?roomId=${encodeURIComponent(coach.roomId)}`}
                          className="inline-flex items-center rounded-full border border-[#2b2b34] bg-[#202028] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#262630]"
                        >
                          Join with room ID
                        </a>
                      ) : null}
                    </div>
                  </div>
                </GlassPanel>
              ))
            ) : (
              <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5 xl:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#202028] text-white/75">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white">No coaches matched</h2>
                    <p className="text-[13px] text-white/45">Try a different name, specialty, or room keyword.</p>
                  </div>
                </div>
              </GlassPanel>
            )}
          </div>
        )}
      </div>
    </ClientShell>
  );
}
