import { isValidRoomId, normalizeRoomId } from "@heimdallfit/types";
import { ensureClientProfile, ensureCoachBootstrapped, getAuthenticatedUserFromToken } from "../../../../lib/coach-dashboard-server";
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

function fallbackClientName(email: string | null | undefined) {
  if (!email) return "Client";
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

async function acceptInviteForClient(user: Awaited<ReturnType<typeof getAuthenticatedUserFromToken>>, inviteToken: string) {
  const supabase = getSupabaseAdminClient();
  const { data: invite, error: inviteError } = await supabase
    .from("room_join_requests")
    .select("id, coach_id, room_id, client_name, client_email")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) throw new Error("Invite not found.");

  const fullName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    invite.client_name ||
    fallbackClientName(user.email);

  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const [profileUpsert, clientUpsert, inviteUpdate] = await Promise.all([
    supabase.from("profiles").upsert(
      {
        id: user.id,
        role: "client",
        full_name: fullName,
        avatar_url: avatarUrl
      },
      { onConflict: "id" }
    ),
    supabase.from("clients").upsert(
      {
        id: user.id,
        coach_id: invite.coach_id,
        room_id: invite.room_id,
        status: "pending"
      },
      { onConflict: "id" }
    ),
    supabase
      .from("room_join_requests")
      .update({
        client_profile_id: user.id,
        client_email: user.email || invite.client_email,
        accepted_at: new Date().toISOString()
      })
      .eq("id", invite.id)
  ]);

  const possibleError = profileUpsert.error || clientUpsert.error || inviteUpdate.error;
  if (possibleError) throw possibleError;
}

async function joinRoomForClient(user: Awaited<ReturnType<typeof getAuthenticatedUserFromToken>>, rawRoomId: string) {
  const supabase = getSupabaseAdminClient();
  const roomId = normalizeRoomId(rawRoomId);

  if (!isValidRoomId(roomId)) {
    throw new Error("Room ID must be 8 uppercase letters or numbers.");
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, coach_id")
    .eq("room_id", roomId)
    .maybeSingle();

  if (roomError || !room) {
    throw roomError || new Error("Room ID not found.");
  }

  const { error: clientError } = await supabase.from("clients").upsert(
    {
      id: user.id,
      coach_id: room.coach_id,
      room_id: room.id,
      status: "active"
    },
    { onConflict: "id" }
  );

  if (clientError) throw clientError;

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
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const { portal, inviteToken, roomId } = (await request.json()) as {
      portal?: "coach" | "client";
      inviteToken?: string;
      roomId?: string;
    };

    if (portal !== "coach" && portal !== "client") {
      return Response.json({ error: "Portal type is required." }, { status: 400 });
    }

    const user = await getAuthenticatedUserFromToken(token);

    if (portal === "coach") {
      await ensureCoachBootstrapped(user);
      return Response.json({ ok: true, portal });
    }

    await ensureClientProfile(user);

    if (inviteToken) {
      await acceptInviteForClient(user, inviteToken);
    }

    if (roomId) {
      await joinRoomForClient(user, roomId);
    }

    return Response.json({ ok: true, portal });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to prepare this portal account.") }, { status: 500 });
  }
}
