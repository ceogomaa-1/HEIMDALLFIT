import type { CoachProfileAchievement, CoachProfileGalleryItem, UpdateCoachProfilePayload } from "../../../../lib/coach-profile-types";
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
    supabase.from("coaches").select("*").eq("id", user.id).single()
  ]);

  const coachData = coachResponse.data || {};
  const rawGallery = Array.isArray((coachData as { marketplace_gallery?: unknown }).marketplace_gallery)
    ? ((coachData as { marketplace_gallery?: unknown[] }).marketplace_gallery || [])
    : [];
  const rawAchievements = Array.isArray((coachData as { achievements?: unknown }).achievements)
    ? ((coachData as { achievements?: unknown[] }).achievements || [])
    : [];

  const avatarPath = profileResponse.data?.avatar_url || null;
  const bannerPath = (coachData as { banner_url?: string | null }).banner_url || null;
  const avatarUrl = await resolveStorageAssetUrl(supabase, "coach-branding", avatarPath);
  const bannerUrl = await resolveStorageAssetUrl(supabase, "coach-branding", bannerPath);
  const gallery = await Promise.all(
    rawGallery.map(async (item, index) => {
      const galleryItem = item as { id?: string; path?: string; caption?: string };
      const path = typeof galleryItem.path === "string" ? galleryItem.path : "";
      const url = path ? await resolveStorageAssetUrl(supabase, "coach-branding", path) : null;
      const normalized: CoachProfileGalleryItem = {
        id: typeof galleryItem.id === "string" ? galleryItem.id : `gallery-${index}`,
        path,
        caption: typeof galleryItem.caption === "string" ? galleryItem.caption : "",
        url
      };
      return normalized;
    })
  );
  const achievements: CoachProfileAchievement[] = rawAchievements.map((item, index) => {
    const achievement = item as { id?: string; title?: string; issuer?: string; year?: string; category?: string };
    return {
      id: typeof achievement.id === "string" ? achievement.id : `achievement-${index}`,
      title: typeof achievement.title === "string" ? achievement.title : "",
      issuer: typeof achievement.issuer === "string" ? achievement.issuer : "",
      year: typeof achievement.year === "string" ? achievement.year : "",
      category: typeof achievement.category === "string" ? achievement.category : ""
    };
  });

  return {
    id: user.id,
    fullName: profileResponse.data?.full_name || "Coach",
    handle: user.email ? `@${user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@coach",
    avatarPath,
    avatarUrl,
    bannerPath,
    bannerUrl,
    brandName: (coachData as { brand_name?: string }).brand_name || "Coach",
    specialty: (coachData as { specialty?: string }).specialty || "",
    bio: (coachData as { bio?: string }).bio || "",
    roomId: room.room_id,
    roomName: room.room_name,
    brandTagline: room.brand_tagline,
    gallery,
    achievements
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
    const sanitizedGallery = (payload.gallery || [])
      .map((item) => ({
        id: String(item.id || ""),
        path: String(item.path || "").trim(),
        caption: String(item.caption || "").trim()
      }))
      .filter((item) => item.id && item.path);
    const sanitizedAchievements = (payload.achievements || [])
      .map((item) => ({
        id: String(item.id || ""),
        title: String(item.title || "").trim(),
        issuer: String(item.issuer || "").trim(),
        year: String(item.year || "").trim(),
        category: String(item.category || "").trim()
      }))
      .filter((item) => item.id && item.title);

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
          banner_url: payload.bannerPath?.trim() || null,
          marketplace_gallery: sanitizedGallery,
          achievements: sanitizedAchievements
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
    const message = getErrorMessage(error, "Unable to save profile.");
    const schemaHint =
      message.includes("marketplace_gallery") || message.includes("achievements")
        ? "Run the latest Supabase coach profile marketplace migration before saving gallery posts or achievements."
        : message;
    return Response.json({ error: schemaHint }, { status: 500 });
  }
}
