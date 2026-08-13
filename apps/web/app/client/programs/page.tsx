"use client";

import { ArrowUpRight, CalendarDays, Dumbbell, Play, Sparkles } from "lucide-react";
import { ClientShell } from "../../../components/client-shell";
import { useClientDashboard } from "../../../lib/use-client-dashboard";

const fallbackProfile = { name: "Client", handle: "@client", role: "Client", avatar: null as string | null };

export default function ClientProgramsPage() {
  const { data, error, loading } = useClientDashboard("/client/programs");
  const profile = data?.profile || fallbackProfile;

  return (
    <ClientShell profile={profile}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[calc(7.5rem+env(safe-area-inset-bottom))] xl:pb-4">
        <section className="pb-5">
          <p className="text-[13px] text-white/45">Your training</p>
          <h1 className="mt-1 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.1rem]">Programs</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/48">Everything your coach has assigned, ready when you are.</p>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2].map((item) => <div key={item} className="skeleton h-52 rounded-[24px]" />)}
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">{error}</div>
        ) : data?.programs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.programs.map((program, index) => (
              <article key={program.id} className="group relative overflow-hidden rounded-[26px] bg-[#17181d]">
                <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                      {index === 0 ? <Play className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                    </span>
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/42">{program.sport}</span>
                  </div>
                  <h2 className="mt-6 font-display text-xl font-semibold tracking-[-0.04em] text-white">{program.title}</h2>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/38"><CalendarDays className="h-3.5 w-3.5" /> Added {program.createdAt}</div>
                  <button type="button" className="mt-6 flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.28)] transition hover:bg-blue-500">
                    Open program <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] bg-white/[0.035] px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-blue-400/15 bg-blue-500/10 text-blue-300"><Sparkles className="h-7 w-7" /></span>
            <h2 className="mt-5 font-display text-xl font-semibold text-white">Your first program will land here</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">Once your coach assigns a training plan, you’ll be able to open and follow it from this dedicated view.</p>
          </div>
        )}
      </div>
    </ClientShell>
  );
}
