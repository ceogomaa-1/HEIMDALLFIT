"use client";

import Link from "next/link";
import { Activity, CalendarDays, ChevronRight, Compass, Dumbbell, Scale, ShieldCheck, UserRound } from "lucide-react";
import { ClientShell } from "../../../components/client-shell";
import { useClientDashboard } from "../../../lib/use-client-dashboard";

const fallbackProfile = { name: "Client", handle: "@client", role: "Client", avatar: null as string | null };

function ProfileAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return avatar ? (
    <img src={avatar} alt={name} className="h-20 w-20 rounded-[26px] object-cover" />
  ) : (
    <span className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-blue-400/20 bg-[linear-gradient(145deg,rgba(37,99,235,0.35),rgba(16,185,129,0.14))] font-display text-2xl font-semibold text-white">{initials || "C"}</span>
  );
}

export default function ClientProfilePage() {
  const { data, error, loading } = useClientDashboard("/client/profile");
  const profile = data?.profile || fallbackProfile;

  return (
    <ClientShell profile={profile}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-[calc(7.5rem+env(safe-area-inset-bottom))] xl:pb-4">
        <section>
          <p className="text-[13px] text-white/45">Your account</p>
          <h1 className="mt-1 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.1rem]">Profile</h1>
        </section>

        {loading ? (
          <div className="space-y-4"><div className="skeleton h-48 rounded-[26px]" /><div className="skeleton h-60 rounded-[26px]" /></div>
        ) : error ? (
          <div className="rounded-[22px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">{error}</div>
        ) : data ? (
          <>
            <section className="overflow-hidden rounded-[28px] bg-white/[0.045]">
              <div className="relative bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.22),transparent_42%),linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <ProfileAvatar name={data.profile.name} avatar={data.profile.avatar} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-2xl font-semibold tracking-[-0.04em] text-white">{data.profile.name}</p>
                    <p className="mt-1 truncate text-sm text-white/45">{data.profile.handle}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Client account</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Programs", value: data.stats.assignedPrograms, icon: Dumbbell, color: "text-blue-300" },
                { label: "Weight", value: data.stats.currentWeight, icon: Scale, color: "text-amber-300" },
                { label: "Membership", value: data.stats.membershipStatus, icon: Activity, color: "text-emerald-300" },
                { label: "Joined", value: data.stats.joinedDate, icon: CalendarDays, color: "text-violet-300" }
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-[22px] bg-white/[0.045] p-4">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <p className="mt-4 truncate font-display text-lg font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-white/38">{item.label}</p>
                </div>
              ))}
            </div>

            <section className="rounded-[24px] bg-white/[0.045] p-3">
              {data.linkedCoach ? (
                <Link href="/client/messages" className="flex min-h-16 touch-manipulation items-center gap-3 rounded-[18px] px-3 transition hover:bg-white/[0.04]">
                  {data.linkedCoach.avatar ? <img src={data.linkedCoach.avatar} alt={data.linkedCoach.name} className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/15 text-sm font-semibold text-blue-200">{data.linkedCoach.name[0]}</span>}
                  <span className="min-w-0 flex-1"><span className="block text-xs text-white/35">Your coach</span><span className="mt-1 block truncate text-sm font-semibold text-white">{data.linkedCoach.name}</span></span>
                  <ChevronRight className="h-5 w-5 text-white/30" />
                </Link>
              ) : (
                <Link href="/client/find-coach" className="flex min-h-16 touch-manipulation items-center gap-3 rounded-[18px] px-3 transition hover:bg-white/[0.04]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/12 text-blue-300"><Compass className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs text-white/35">No coach connected</span><span className="mt-1 block text-sm font-semibold text-white">Find your coach</span></span>
                  <ChevronRight className="h-5 w-5 text-white/30" />
                </Link>
              )}
            </section>

            <section className="flex items-center gap-3 rounded-[24px] bg-white/[0.035] p-5 text-sm leading-6 text-white/46">
              <UserRound className="h-5 w-5 shrink-0 text-blue-300" />
              Profile editing, preferences, and privacy controls will live here as the client account system expands.
            </section>
          </>
        ) : null}
      </div>
    </ClientShell>
  );
}
