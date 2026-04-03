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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4 py-10 text-white">
      <div className="glass w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-[#14141abf]">
        <div className="relative h-64 w-full">
          {coach?.banner_url ? (
            <img src={coach.banner_url} alt={`${coachName} banner`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(88,22,22,0.48),transparent_25%),linear-gradient(135deg,#17171d,#23232b)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111117] via-[#111117]/45 to-transparent" />
          <div className="absolute bottom-6 left-6 flex items-end gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={coachName} className="h-20 w-20 rounded-full border-4 border-[#111117] object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#111117] bg-white text-xl font-semibold text-black">
                {coachName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part: string) => part[0]?.toUpperCase() || "")
                  .join("")}
              </div>
            )}
            <div className="pb-1">
              <p className="text-sm uppercase tracking-[0.28em] text-white/45">Coach Invite</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{coachName}</h1>
              <p className="mt-1 text-sm text-white/60">{coach?.specialty || coach?.brand_name || "Coach Room"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">
              Join {room?.room_name || `${coachName}'s Room`}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/62">
              {room?.brand_tagline || coach?.bio || "This route mirrors the mobile deep link and opens the coach’s room for client onboarding."}
            </p>
            {coach?.bio ? <p className="mt-4 text-sm leading-7 text-white/45">{coach.bio}</p> : null}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-left">
            <p className="text-sm text-white/55">Coach ID</p>
            <p className="mt-2 text-xl font-semibold break-all">{params.coachId}</p>
            <p className="mt-6 text-sm text-white/55">Primary room ID</p>
            <p className="mt-2 text-2xl font-semibold">{room?.room_id || "Unavailable"}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/client"
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Continue as Client
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
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
