import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { resolveStorageAssetUrl } from "../../../../lib/storage";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return Response.json({ error: "Invite token missing." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: invite, error } = await supabase
      .from("room_join_requests")
      .select("id, client_name, client_email, status, room_id, coach_id")
      .eq("invite_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!invite) {
      return Response.json({ error: "Invite not found." }, { status: 404 });
    }

    const [{ data: room }, { data: coach }, { data: profile }] = await Promise.all([
      supabase.from("rooms").select("room_id, room_name").eq("id", invite.room_id).single(),
      supabase.from("coaches").select("brand_name, specialty, banner_url").eq("id", invite.coach_id).single(),
      supabase.from("profiles").select("full_name, avatar_url").eq("id", invite.coach_id).single()
    ]);

    const [avatarUrl, bannerUrl] = await Promise.all([
      resolveStorageAssetUrl(supabase, "coach-branding", profile?.avatar_url || null),
      resolveStorageAssetUrl(supabase, "coach-branding", coach?.banner_url || null)
    ]);

    return Response.json({
      invite: {
        token,
        clientName: invite.client_name || "",
        clientEmail: invite.client_email || "",
        status: invite.status,
        coachName: coach?.brand_name || profile?.full_name || "Coach",
        coachSpecialty: coach?.specialty || "",
        roomCode: room?.room_id || "",
        roomName: room?.room_name || "",
        coachAvatarUrl: avatarUrl,
        coachBannerUrl: bannerUrl
      }
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load invite." },
      { status: 500 }
    );
  }
}
