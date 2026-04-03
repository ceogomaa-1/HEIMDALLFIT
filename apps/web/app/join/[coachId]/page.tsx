import Link from "next/link";
import { getSupabaseAdminClient } from "../../../lib/supabase-admin";

export default async function JoinCoachPage({ params }: { params: { coachId: string } }) {
  const supabase = getSupabaseAdminClient();

  const [{ data: profile }, { data: coach }, { data: room }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", params.coachId).maybeSingle(),
    supabase.from("coaches").select("brand_name, bio, specialty, banner_url").eq("id", params.coachId).maybeSingle(),
    supabase
      .from("rooms")
      .select("room_id, room_name, brand_tagline")
      .eq("coach_id", params.coachId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);

  const coachName = profile?.full_name || coach?.brand_name || "Coach";
  const coachInitials = coachName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-void)] px-4 py-10 text-white">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/[0.08] bg-[rgba(12,12,20,0.84)] shadow-[var(--shadow-panel)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -left-16 top-[-60px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(0,163,255,0.14),transparent_70%)] animate-[orb-drift_9s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute -bottom-20 right-[-40px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(67,208,127,0.10),transparent_70%)] animate-[orb-drift_11s_ease-in-out_infinite]" />

        <div className="relative h-72 w-full">
          {coach?.banner_url ? (
            <img src={coach.banner_url} alt={`${coachName} banner`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_20%_30%,rgba(0,163,255,0.20),transparent_35%),radial-gradient(ellipse_at_80%_70%,rgba(67,208,127,0.12),transparent_35%),linear-gradient(135deg,#0d1018,#171b24)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-[#0c0c12]/45 to-transparent" />
          <div className="absolute bottom-7 left-7 flex items-end gap-4">
            {profile?.avatar_url ? (
              <div className="rounded-full bg-[linear-gradient(135deg,var(--accent),var(--green))] p-[2px] shadow-[0_0_24px_rgba(0,163,255,0.24)]">
                <img src={profile.avatar_url} alt={coachName} className="h-20 w-20 rounded-full border-4 border-[#111117] object-cover" />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#111117] bg-[linear-gradient(135deg,rgba(0,163,255,0.25),rgba(67,208,127,0.16))] text-xl font-semibold text-white shadow-[0_0_24px_rgba(0,163,255,0.18)]">
                {coachInitials}
              </div>
            )}
            <div className="pb-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent)]">Coach Invite</p>
              <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.05em]">{coachName}</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{coach?.specialty || coach?.brand_name || "Coach Room"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-7 py-7 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
              Join {room?.room_name || `${coachName}'s Room`}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {room?.brand_tagline || coach?.bio || "This route mirrors the mobile deep link and opens the coach’s room for client onboarding."}
            </p>
            {coach?.bio ? <p className="mt-4 text-sm leading-7 text-white/45">{coach.bio}</p> : null}
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 text-left shadow-[var(--shadow-card)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">Coach ID</p>
            <p className="mt-2 break-all text-xl font-semibold text-white">{params.coachId}</p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">Primary room ID</p>
            <p className="mt-2 text-2xl font-semibold text-white">{room?.room_id || "Unavailable"}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/client"
                className="inline-flex rounded-[14px] bg-[linear-gradient(135deg,var(--accent),rgba(0,120,220,1))] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,163,255,0.28)] transition hover:-translate-y-px hover:shadow-[0_14px_34px_rgba(0,163,255,0.36)]"
              >
                Continue as Client
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-[14px] border border-white/[0.10] bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/[0.16] hover:bg-white/[0.10]"
              >
                Back to Portals
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
