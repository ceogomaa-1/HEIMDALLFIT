"use client";

import Link from "next/link";
import type { Route } from "next";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronRight, Compass, Dumbbell, MessageCircleMore, Play, ShoppingBag, Sparkles } from "lucide-react";
import { ClientShell } from "../../components/client-shell";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";
import type { ClientDashboardData } from "../../lib/use-client-dashboard";

function Avatar({ name, image, size = "md" }: { name: string; image: string | null; size?: "md" | "lg" }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  const sizeClass = size === "lg" ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm";
  return image ? (
    <img src={image} alt={name} className={`${sizeClass} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[#23242a] font-semibold text-white`}>{initials || "H"}</span>
  );
}

function SectionHeading({ title, href, linkLabel = "See all" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-[19px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
      {href ? <Link href={href as Route} className="flex min-h-10 items-center gap-1 text-[13px] font-medium text-white/48 transition hover:text-white">{linkLabel}<ChevronRight className="h-4 w-4" /></Link> : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7 pb-32">
      <div><div className="skeleton h-10 w-64 rounded-xl" /><div className="mt-3 skeleton h-4 w-52" /></div>
      <div className="skeleton h-52 rounded-[28px]" />
      <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((item) => <div key={item} className="skeleton h-24 rounded-[20px]" />)}</div>
      <div className="skeleton h-40 rounded-[24px]" />
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
  const [data, setData] = useState<ClientDashboardData | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setError("HEIMDALLFIT couldn’t connect to your account. Please refresh and try again.");
        setLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.access_token) {
        router.replace("/client/auth?next=%2Fclient");
        return;
      }

      try {
        if (roomIdParam) {
          setJoining(true);
          const joinResponse = await fetch("/api/client/join-room", {
            method: "POST",
            headers: { "Content-Type": "application/json", authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ roomId: roomIdParam })
          });
          const joinPayload = await joinResponse.json();
          if (!joinResponse.ok) throw new Error(joinPayload.error || "Unable to join this room.");
          router.replace("/client");
          return;
        }

        const response = await fetch("/api/client/dashboard", { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load your dashboard.");
        if (active) setData(payload as ClientDashboardData);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.");
      } finally {
        if (active) { setJoining(false); setLoading(false); }
      }
    }

    void load();
    return () => { active = false; };
  }, [roomIdParam, router, supabase]);

  const shellProfile = data?.profile || { name: loading ? "Loading..." : "Client", handle: "@client", role: "Client", avatar: null };
  const firstName = data?.profile.name.split(" ")[0] || "there";
  const featuredProgram = data?.programs[0] || null;

  return (
    <ClientShell profile={shellProfile}>
      {loading || joining ? <DashboardSkeleton /> : error ? (
        <div className="rounded-[24px] bg-[#221216] px-5 py-4 text-sm leading-6 text-[#ffb4bb]">{error}</div>
      ) : data ? (
        <div className="page-enter flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[calc(8rem+env(safe-area-inset-bottom))] xl:pb-8">
          <div className="mx-auto w-full max-w-[1120px] space-y-9">
            <section className="pt-1 sm:pt-3">
              <p className="text-[14px] font-medium text-white/48">Welcome back</p>
              <h1 className="mt-1 max-w-[13ch] font-display text-[2.45rem] font-semibold leading-[0.98] tracking-[-0.025em] text-white sm:text-[3.5rem]">{firstName}.</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-white/46">
                <span className="capitalize text-emerald-400">{data.stats.membershipStatus}</span><span className="text-white/18">•</span>
                <span>{data.stats.currentWeight}</span><span className="text-white/18">•</span>
                <span>Member since {data.stats.joinedDate}</span>
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#1f5eff_0%,#5638c9_56%,#171a2b_100%)] shadow-[0_22px_70px_rgba(37,99,235,0.22)]">
              <div className="relative p-6 sm:p-8">
                <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/12 blur-3xl" />
                <div className="relative max-w-xl">
                  <p className="text-[13px] font-semibold text-white/72">{featuredProgram ? "Up next" : "Your next step"}</p>
                  <h2 className="mt-3 font-display text-[2rem] font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:text-[2.6rem]">
                    {featuredProgram ? featuredProgram.title : data.linkedCoach ? "Your coach is building your plan." : "Find the right coach for your goals."}
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/68">
                    {featuredProgram ? `${featuredProgram.sport} · Added ${featuredProgram.createdAt}` : data.linkedCoach ? "You’ll see your first program here as soon as it’s ready." : "Explore coaches, compare specialties, and connect when it feels right."}
                  </p>
                  <Link href={(featuredProgram ? "/client/programs" : data.linkedCoach ? "/client/messages" : "/client/find-coach") as Route} className="mt-6 inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#101114] shadow-lg transition hover:scale-[1.02]">
                    {featuredProgram ? <Play className="h-4 w-4 fill-current" /> : data.linkedCoach ? <MessageCircleMore className="h-4 w-4" /> : <Compass className="h-4 w-4" />}
                    {featuredProgram ? "Open program" : data.linkedCoach ? "Message coach" : "Find a coach"}
                  </Link>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-3">
              {[
                { value: data.stats.assignedPrograms, label: "Programs" },
                { value: data.stats.currentWeight, label: "Weight" },
                { value: data.stats.storeItems, label: "Offers" }
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-[22px] bg-white/[0.045] px-3 py-5 text-center sm:px-5">
                  <p className="truncate text-[18px] font-semibold tracking-[-0.03em] text-white sm:text-2xl">{item.value}</p>
                  <p className="mt-1 text-[12px] text-white/38">{item.label}</p>
                </div>
              ))}
            </section>

            <section>
              <SectionHeading title="Your coach" href={data.linkedCoach ? "/client/messages" : "/client/find-coach"} linkLabel={data.linkedCoach ? "Message" : "Explore"} />
              {data.linkedCoach ? (
                <Link href="/client/messages" className="mt-4 flex min-h-[92px] touch-manipulation items-center gap-4 rounded-[24px] bg-white/[0.045] p-4 transition hover:bg-white/[0.07]">
                  <Avatar name={data.linkedCoach.name} image={data.linkedCoach.avatar} size="lg" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[17px] font-semibold text-white">{data.linkedCoach.name}</span><span className="mt-1 block truncate text-[13px] text-white/45">{data.linkedCoach.specialty}</span><span className="mt-2 block text-[12px] text-white/30">Room {data.linkedCoach.roomId}</span></span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#111217]"><MessageCircleMore className="h-5 w-5" /></span>
                </Link>
              ) : (
                <Link href="/client/find-coach" className="mt-4 flex min-h-[92px] items-center gap-4 rounded-[24px] bg-white/[0.045] p-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15 text-blue-300"><Compass className="h-6 w-6" /></span><span className="flex-1"><span className="block font-semibold text-white">Find your coach</span><span className="mt-1 block text-sm text-white/42">Browse coaches who match your goals.</span></span><ArrowRight className="h-5 w-5 text-white/35" /></Link>
              )}
            </section>

            <section>
              <SectionHeading title="Programs" href="/client/programs" />
              <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
                {data.programs.length ? data.programs.slice(0, 3).map((program, index) => (
                  <Link key={program.id} href="/client/programs" className="relative min-h-[170px] w-[78vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-[26px] bg-[#17181d] p-5 sm:w-auto sm:max-w-none">
                    <div className={`absolute inset-x-0 top-0 h-1 ${index % 2 ? "bg-violet-500" : "bg-blue-500"}`} />
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] text-white"><Dumbbell className="h-4 w-4" /></span>
                    <h3 className="mt-6 truncate text-[17px] font-semibold text-white">{program.title}</h3>
                    <p className="mt-1 text-[13px] text-white/42">{program.sport} · {program.createdAt}</p>
                  </Link>
                )) : (
                  <div className="flex min-h-[150px] w-full items-center gap-4 rounded-[24px] bg-white/[0.035] p-5 text-sm text-white/42 sm:col-span-2 lg:col-span-3"><Sparkles className="h-5 w-5 text-blue-300" />Your assigned programs will appear here.</div>
                )}
              </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-2">
              <div>
                <SectionHeading title="Updates" />
                <div className="mt-3 divide-y divide-white/[0.06]">
                  {data.notifications.map((item, index) => (
                    <div key={item} className="flex gap-3 py-4"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-400" /><div className="min-w-0"><p className="text-sm leading-6 text-white/68">{item}</p><p className="mt-1 text-[12px] text-white/28">{index === 0 ? "Today" : "Your account"}</p></div></div>
                  ))}
                </div>
              </div>

              {data.store.length ? (
                <div>
                  <SectionHeading title="From your coach" />
                  <div className="mt-3 space-y-2">{data.store.slice(0, 3).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-[20px] bg-white/[0.035] p-3">{item.image ? <img src={item.image} alt={item.title} className="h-14 w-14 rounded-[14px] object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-white/[0.05] text-white/45"><ShoppingBag className="h-5 w-5" /></span>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{item.title}</p><p className="mt-1 truncate text-[12px] text-white/38">{item.subtitle}</p></div><span className="text-sm font-semibold text-white">{item.priceLabel}</span></div>)}</div>
                </div>
              ) : null}
            </section>

            <div className="flex items-center gap-2 pb-4 text-[12px] text-white/24"><CalendarDays className="h-4 w-4" /> Member since {data.stats.joinedDate}</div>
          </div>
        </div>
      ) : null}
    </ClientShell>
  );
}

export default function ClientPortalPage() {
  return <Suspense fallback={null}><ClientDashboardContent /></Suspense>;
}
