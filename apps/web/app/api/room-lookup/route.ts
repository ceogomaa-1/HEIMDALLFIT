import { isValidRoomId, normalizeRoomId } from "@heimdallfit/types";
import { getSupabaseAdminClient } from "../../../lib/supabase-admin";
import { resolveStorageAssetUrl } from "../../../lib/storage";

export async function POST(request: Request) {
  const body = await request.json();
  const roomId = normalizeRoomId(body.roomId ?? "");

  if (!isValidRoomId(roomId)) {
    return Response.json({ error: "Room ID must be 8 uppercase letters or numbers." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, coach_id, room_id, room_name, brand_tagline")
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!room) {
    return Response.json({ error: "Room ID not found." }, { status: 404 });
  }

  const [{ data: coach }, { data: profile }] = await Promise.all([
    supabase.from("coaches").select("brand_name, banner_url").eq("id", room.coach_id).maybeSingle(),
    supabase.from("profiles").select("full_name, avatar_url").eq("id", room.coach_id).maybeSingle()
  ]);

  const [avatarUrl, bannerUrl] = await Promise.all([
    resolveStorageAssetUrl(supabase, "coach-branding", profile?.avatar_url || null),
    resolveStorageAssetUrl(supabase, "coach-branding", coach?.banner_url || null)
  ]);

  return Response.json({
    room: {
      coachId: room.coach_id,
      roomId: room.room_id,
      roomName: room.room_name,
      brandTagline: room.brand_tagline,
      brandName: coach?.brand_name || profile?.full_name || "Coach",
      avatarUrl,
      bannerUrl
    }
  });
}
