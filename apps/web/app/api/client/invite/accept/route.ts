import { getAuthenticatedUserFromToken } from "../../../../../lib/coach-dashboard-server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function fallbackClientName(email: string | null | undefined) {
  if (!email) return "Client";
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const body = await request.json();
    const inviteToken = String(body.inviteToken || "").trim();
    if (!inviteToken) {
      return Response.json({ error: "Invite token missing." }, { status: 400 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const supabase = getSupabaseAdminClient();

    const { data: invite, error: inviteError } = await supabase
      .from("room_join_requests")
      .select("id, coach_id, room_id, client_name, client_email, status")
      .eq("invite_token", inviteToken)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) {
      return Response.json({ error: "Invite not found." }, { status: 404 });
    }

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
    if (possibleError) {
      throw possibleError;
    }

    return Response.json({
      accepted: true,
      coachId: invite.coach_id,
      roomId: invite.room_id
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to accept invite." },
      { status: 500 }
    );
  }
}
