import type { UpdateCoachProfilePayload } from "../../../../lib/coach-profile-types";
import { ensureCoachBootstrapped, getAuthenticatedUserFromToken } from "../../../../lib/coach-dashboard-server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { resolveStorageAssetUrl } from "../../../../lib/storage";

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

async function getCoachProfile(token: string) {
  const user = await getAuthenticatedUserFromToken(token);
  const supabase = getSupabaseAdminClient();
  const room = await ensureCoachBootstrapped(user);

  const [profileResponse, coachResponse] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
    supabase.from("coaches").select("brand_name, specialty, bio, banner_url").eq("id", user.id).single()
  ]);

  const avatarUrl = await resolveStorageAssetUrl(supabase, "coach-branding", profileResponse.data?.avatar_url || null);
  const bannerUrl = await resolveStorageAssetUrl(supabase, "coach-branding", coachResponse.data?.banner_url || null);

  return {
    id: user.id,
    fullName: profileResponse.data?.full_name || "Coach",
    handle: user.email ? `@${user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@coach",
    avatarPath: profileResponse.data?.avatar_url || null,
    avatarUrl,
    bannerPath: coachResponse.data?.banner_url || null,
    bannerUrl,
    brandName: coachResponse.data?.brand_name || "Coach",
    specialty: coachResponse.data?.specialty || "",
    bio: coachResponse.data?.bio || "",
    roomId: room.room_id,
    roomName: room.room_name,
    brandTagline: room.brand_tagline
  };
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const profile = await getCoachProfile(token);
    return Response.json(profile);
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to load profile.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const supabase = getSupabaseAdminClient();
    const payload = (await request.json()) as UpdateCoachProfilePayload;

    const sanitizedFullName = payload.fullName.trim() || "Coach";
    const sanitizedBrandName = payload.brandName.trim() || `${sanitizedFullName} Coaching`;
    const sanitizedRoomName = payload.roomName.trim() || `${sanitizedFullName}'s Room`;
    const sanitizedTagline = payload.brandTagline.trim() || "Invite, manage, and win.";

    await ensureCoachBootstrapped(user);

    const [profileUpdate, coachUpdate, roomUpdate] = await Promise.all([
      supabase
        .from("profiles")
        .update({
          full_name: sanitizedFullName,
          avatar_url: payload.avatarPath?.trim() || null
        })
        .eq("id", user.id),
      supabase
        .from("coaches")
        .update({
          brand_name: sanitizedBrandName,
          specialty: payload.specialty.trim(),
          bio: payload.bio.trim(),
          banner_url: payload.bannerPath?.trim() || null
        })
        .eq("id", user.id),
      supabase
        .from("rooms")
        .update({
          room_name: sanitizedRoomName,
          brand_tagline: sanitizedTagline
        })
        .eq("coach_id", user.id)
    ]);

    const possibleError = profileUpdate.error || coachUpdate.error || roomUpdate.error;
    if (possibleError) {
      throw possibleError;
    }

    const profile = await getCoachProfile(token);
    return Response.json(profile);
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to save profile.") }, { status: 500 });
  }
}
