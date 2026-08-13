"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Award, Compass, Search, Users } from "lucide-react";
import { ClientShell } from "../../../components/client-shell";
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
  gallery: Array<{ id: string; image: string | null; caption: string }>;
  achievements: Array<{ id: string; title: string; category: string; issuer: string; year: string }>;
};

export default function FindCoachPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient("client"), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
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
        const response = await fetch(`/api/client/coaches?q=${encodeURIComponent(deferredQuery)}`);
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
  }, [deferredQuery, router, supabase]);

  return (
    <ClientShell profile={profile}>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom))] xl:pb-4 xl:pr-1">
        <section className="flex flex-col gap-5 pt-1 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-[2rem] font-semibold tracking-[-0.055em] text-white sm:text-[2.4rem]">Find your fit.</h1>
            <p className="mt-2 max-w-[620px] text-[14px] leading-6 text-white/52">
              Discover coaches by specialty, style, and the people already training with them.
            </p>
          </div>
          <div className="relative w-full lg:max-w-[380px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search coaches..."
              className="w-full rounded-2xl border-0 bg-white/[0.07] py-3.5 pl-11 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-white/[0.06] transition placeholder:text-white/35 focus:bg-white/[0.09] focus:ring-white/15"
            />
          </div>
        </section>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="aspect-[4/5] animate-pulse rounded-[28px] bg-white/[0.045]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-500/10 px-5 py-4 text-sm text-red-200">{error}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {coaches.length ? (
              coaches.map((coach) => (
                <article key={coach.id} className="group overflow-hidden rounded-[28px] bg-white/[0.05] transition hover:bg-white/[0.07]">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    {coach.banner ? (
                      <img src={coach.banner} alt={`${coach.name} banner`} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.26),transparent_42%),linear-gradient(135deg,#18181b,#27272a)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute inset-x-4 bottom-4 flex min-w-0 items-end gap-3">
                      {coach.avatar ? (
                        <img src={coach.avatar} alt={coach.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-white/70" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-black ring-2 ring-white/70">
                          {coach.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() || "")
                            .join("")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[17px] font-semibold text-white">{coach.name}</p>
                        <p className="truncate text-[13px] text-white/70">{coach.specialty}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5 p-5">
                    <p className="line-clamp-3 text-[14px] leading-6 text-white/58">{coach.bio}</p>
                    {coach.gallery.length ? (
                      <div>
                        <p className="text-[13px] font-medium text-white/82">Training style</p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {coach.gallery.slice(0, 3).map((item) => (
                            <div key={item.id} className="overflow-hidden rounded-xl bg-white/[0.05]">
                              <div className="aspect-square bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_48%),linear-gradient(135deg,#17171d,#24242c)]">
                                {item.image ? <img src={item.image} alt={item.caption || "Coach gallery"} className="h-full w-full object-cover" /> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {coach.achievements.length ? (
                      <div>
                        <p className="text-[13px] font-medium text-white/82">Credentials</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {coach.achievements.slice(0, 4).map((item) => (
                            <div key={item.id} className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5 text-[11px] text-amber-200">
                              <Award className="h-3.5 w-3.5" />
                              {item.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-[13px] text-white/45">
                      <Users className="h-4 w-4" />
                      {coach.activeMembers} active {coach.activeMembers === 1 ? "member" : "members"}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/join/${coach.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        View profile
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                      {coach.roomId ? (
                        <a
                          href={`/client/auth?roomId=${encodeURIComponent(coach.roomId)}`}
                          className="inline-flex items-center rounded-full bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
                        >
                          Join
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] bg-white/[0.045] p-5 sm:col-span-2 xl:col-span-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] text-white/75">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white">No coaches matched</h2>
                    <p className="text-[13px] text-white/45">Try a different name, specialty, or room keyword.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientShell>
  );
}
