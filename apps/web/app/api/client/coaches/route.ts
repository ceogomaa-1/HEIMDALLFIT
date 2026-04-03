import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { resolveStorageAssetUrl } from "../../../../lib/storage";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";
  const supabase = getSupabaseAdminClient();

  const [{ data: coaches }, { data: profiles }, { data: rooms }, { data: clients }] = await Promise.all([
    supabase.from("coaches").select("id, brand_name, specialty, bio, banner_url").order("created_at", { ascending: false }).limit(40),
    supabase.from("profiles").select("id, full_name, avatar_url"),
    supabase.from("rooms").select("coach_id, room_id, room_name"),
    supabase.from("clients").select("coach_id, status")
  ]);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const roomMap = new Map((rooms || []).map((room) => [room.coach_id, room]));
  const activeCounts = new Map<string, number>();

  for (const client of clients || []) {
    if (client.status !== "active") continue;
    activeCounts.set(client.coach_id, (activeCounts.get(client.coach_id) || 0) + 1);
  }

  const results = await Promise.all(
    (coaches || []).map(async (coach) => {
      const profile = profileMap.get(coach.id);
      const room = roomMap.get(coach.id);
      const [avatar, banner] = await Promise.all([
        resolveStorageAssetUrl(supabase, "coach-branding", profile?.avatar_url || null),
        resolveStorageAssetUrl(supabase, "coach-branding", coach.banner_url || null)
      ]);

      return {
        id: coach.id,
        name: coach.brand_name || profile?.full_name || "Coach",
        specialty: coach.specialty || "Performance Coaching",
        bio: coach.bio || "HEIMDALLFIT coach ready for new clients.",
        avatar,
        banner,
        roomId: room?.room_id || null,
        roomName: room?.room_name || null,
        activeMembers: activeCounts.get(coach.id) || 0
      };
    })
  );

  const filtered = search
    ? results.filter((coach) =>
        [coach.name, coach.specialty, coach.bio, coach.roomName || ""].some((value) => value.toLowerCase().includes(search))
      )
    : results;

  return Response.json({ coaches: filtered });
}
