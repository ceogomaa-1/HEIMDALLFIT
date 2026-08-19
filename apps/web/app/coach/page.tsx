"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CirclePlus, Dumbbell, MessageCircleMore, Search, ShoppingBag, Users } from "lucide-react";
import { CoachShell } from "../../components/coach-shell";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/supabase";
import type { CoachDashboardClient, CoachDashboardResponse } from "../../lib/coach-dashboard-types";
import { cn } from "../../lib/utils";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Toronto" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.045] p-5 sm:p-6">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.015em] text-white">{value}</p>
      <p className="mt-2 text-xs text-white/35">{detail}</p>
    </div>
  );
}

function Action({ href, icon: Icon, title, description }: { href: Route; icon: typeof Dumbbell; title: string; description: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl bg-white/[0.045] p-4 transition hover:bg-white/[0.075] sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-blue-400"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-white/45">{description}</span></span>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:translate-x-1 group-hover:text-white/70" />
    </Link>
  );
}

function ClientRow({ client }: { client: CoachDashboardClient }) {
  const active = client.status === "active";
  return (
    <div className="flex flex-col gap-4 border-t border-white/[0.06] py-5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-sm font-semibold">{client.initials}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{client.name}</p>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", active ? "bg-emerald-400" : "bg-amber-400")} />
          </div>
          <p className="mt-1 truncate text-xs text-white/40">{client.email || `${client.profileCompleteness}% profile complete`}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-5">
        <span><span className="block text-[11px] text-white/35">Last seen</span><span className="mt-1 block text-xs text-white/65">{client.lastSeen}</span></span>
        <span><span className="block text-[11px] text-white/35">Weight</span><span className="mt-1 block text-xs text-white/65">{client.weight}</span></span>
        <span><span className="block text-[11px] text-white/35">Expires</span><span className="mt-1 block text-xs text-white/65">{client.expireDate}</span></span>
      </div>
      <Link href="/coach/messages" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-4 text-xs font-semibold transition hover:bg-white/[0.1]">
        <MessageCircleMore className="h-4 w-4" /> Message
      </Link>
    </div>
  );
}

function LoadingState() {
  return <div className="space-y-4">{[180, 110, 260].map((height) => <div key={height} className="skeleton rounded-3xl" style={{ height }} />)}</div>;
}

export default function CoachPortalPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [dashboard, setDashboard] = useState<CoachDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      if (!isSupabaseConfigured || !supabase) {
        setError("The coach dashboard cannot connect to Supabase yet.");
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your coach session expired. Please sign in again.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/coach/dashboard", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");
        if (active) setDashboard(payload);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, [supabase]);

  const profile = dashboard?.profile || { name: loading ? "Coach" : "Coach", handle: "@coach", role: "Coach", avatar: null };
  const clients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!dashboard || !query) return dashboard?.clients || [];
    return dashboard.clients.filter((client) => client.name.toLowerCase().includes(query) || client.status.includes(query) || client.email?.toLowerCase().includes(query));
  }, [dashboard, search]);

  return (
    <CoachShell profile={profile}>
      {loading ? <LoadingState /> : (
        <div className="space-y-6 pb-24 lg:pb-8">
          {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">{error}</div> : null}

          <section className="overflow-hidden rounded-[28px] bg-[#13151b] p-6 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-blue-400">{greeting()}, {profile.name.split(" ")[0]}.</p>
                <h1 className="mt-3 font-display text-[clamp(2.3rem,6vw,4.5rem)] font-bold leading-[0.96] tracking-[-0.025em]">Your coaching work,<br />in one place.</h1>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/50">See who needs you, build their next plan, and keep every conversation moving.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/coach/onboarding" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold transition hover:bg-blue-500"><CirclePlus className="h-4 w-4" /> Invite client</Link>
                <Link href="/coach/builder" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/85"><Dumbbell className="h-4 w-4" /> Build a plan</Link>
              </div>
            </div>
            {dashboard?.profile.roomId ? <p className="mt-8 text-xs text-white/30">Room code <span className="ml-1 font-semibold text-white/60">{dashboard.profile.roomId}</span></p> : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Metric label="Monthly revenue" value={currency(dashboard?.metrics.monthlyRevenue || 0)} detail={`${dashboard?.metrics.paidOrderRate || 0}% paid order rate`} />
            <Metric label="Active clients" value={String(dashboard?.metrics.activeMembers || 0)} detail={`${dashboard?.metrics.pendingJoins || 0} pending invitations`} />
            <Metric label="Plans this month" value={String(dashboard?.metrics.plansMonth || 0)} detail={`${dashboard?.metrics.plansWeek || 0} created this week`} />
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <Action href="/coach/builder" icon={Dumbbell} title="Create a plan" description="Build training and nutrition for a client." />
            <Action href="/coach/messages" icon={MessageCircleMore} title="Open messages" description="Reply and keep client check-ins moving." />
            <Action href="/coach/store" icon={ShoppingBag} title="Manage your store" description="Publish and update your digital offers." />
          </section>

          <section className="rounded-[28px] bg-white/[0.035] p-5 sm:p-7" id="clients">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-medium text-blue-400">Clients</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.015em]">Your roster</h2><p className="mt-2 text-sm text-white/40">The people currently connected to your coaching room.</p></div>
              <label className="flex h-11 w-full items-center gap-3 rounded-xl bg-white/[0.055] px-4 sm:max-w-[280px]"><Search className="h-4 w-4 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients" className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" /></label>
            </div>
            <div className="mt-6">
              {clients.length ? clients.map((client) => <ClientRow key={client.id} client={client} />) : (
                <div className="flex flex-col items-center rounded-2xl bg-white/[0.025] px-6 py-12 text-center"><Users className="h-6 w-6 text-white/25" /><p className="mt-4 text-sm font-semibold">{search ? "No matching clients" : "Your roster is empty"}</p><p className="mt-2 max-w-sm text-xs leading-5 text-white/40">{search ? "Try another name, email, or status." : "Invite your first client and they’ll appear here automatically."}</p>{!search ? <Link href="/coach/onboarding" className="mt-5 text-sm font-semibold text-blue-400">Invite a client</Link> : null}</div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] bg-white/[0.035] p-5 sm:p-7">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-medium text-blue-400">Store</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.015em]">Live offers</h2></div><Link href="/coach/store" className="text-sm font-semibold text-white/55 transition hover:text-white">Manage store</Link></div>
            {dashboard?.store.length ? <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dashboard.store.slice(0, 3).map((item) => <Link key={item.id} href="/coach/store" className="group overflow-hidden rounded-2xl bg-white/[0.045] transition hover:bg-white/[0.07]">{item.image ? <img src={item.image} alt="" className="h-36 w-full object-cover" /> : <div className="flex h-24 items-end bg-[linear-gradient(135deg,#1b1e27,#111216)] p-4 text-3xl font-bold text-white/10">{item.title[0]}</div>}<div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 line-clamp-1 text-xs text-white/40">{item.subtitle}</p></div><span className="text-sm font-semibold text-emerald-400">{item.priceLabel}</span></div></div></Link>)}</div> : <p className="mt-6 rounded-2xl bg-white/[0.025] px-5 py-10 text-center text-sm text-white/40">No offers are live yet.</p>}
          </section>
        </div>
      )}
    </CoachShell>
  );
}
