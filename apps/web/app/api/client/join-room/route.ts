import { isValidRoomId, normalizeRoomId } from "@heimdallfit/types";
import { ensureClientProfile, getAuthenticatedUserFromToken } from "../../../../lib/coach-dashboard-server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const body = await request.json();
    const roomId = normalizeRoomId(body.roomId || "");

    if (!isValidRoomId(roomId)) {
      return Response.json({ error: "Room ID must be 8 uppercase letters or numbers." }, { status: 400 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const supabase = getSupabaseAdminClient();
    await ensureClientProfile(user);

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, coach_id, room_id, room_name, brand_tagline")
      .eq("room_id", roomId)
      .maybeSingle();

    if (roomError || !room) {
      throw roomError || new Error("Room ID not found.");
    }

    const [{ data: existingProfile }, { data: coachProfile }, { data: coachBrand }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", room.coach_id).maybeSingle(),
      supabase.from("coaches").select("brand_name").eq("id", room.coach_id).maybeSingle()
    ]);

    const { error: clientError } = await supabase.from("clients").upsert(
      {
        id: user.id,
        coach_id: room.coach_id,
        room_id: room.id,
        status: "active"
      },
      { onConflict: "id" }
    );

    if (clientError) {
      throw clientError;
    }

    if (user.email) {
      await supabase
        .from("room_join_requests")
        .update({
          client_profile_id: user.id,
          accepted_at: new Date().toISOString(),
          status: "active"
        })
        .eq("room_id", room.id)
        .eq("client_email", user.email.toLowerCase());
    }

    return Response.json({
      room: {
        roomId: room.room_id,
        roomName: room.room_name,
        brandTagline: room.brand_tagline,
        coachName: coachBrand?.brand_name || coachProfile?.full_name || "Coach"
      }
    });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to join room.") }, { status: 500 });
  }
}
