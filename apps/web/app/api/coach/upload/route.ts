import { getAuthenticatedUserFromToken } from "../../../../lib/coach-dashboard-server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { resolveStorageAssetUrl } from "../../../../lib/storage";

const BUCKET = "coach-branding";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function sanitizeExtension(file: File) {
  const originalExtension = file.name.split(".").pop()?.toLowerCase();
  if (originalExtension && /^[a-z0-9]{2,5}$/.test(originalExtension)) {
    return originalExtension;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "");

    if (!(file instanceof File)) {
      return Response.json({ error: "No image file received." }, { status: 400 });
    }

    if (!["avatar", "banner"].includes(kind)) {
      return Response.json({ error: "Invalid upload kind." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const extension = sanitizeExtension(file);
    const path = `${user.id}/${kind}-${Date.now()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: true
    });

    if (uploadError) {
      throw uploadError;
    }

    const signedUrl = await resolveStorageAssetUrl(supabase, BUCKET, path);
    if (!signedUrl) {
      throw new Error("Upload succeeded, but preview URL could not be created.");
    }

    return Response.json({
      path,
      url: signedUrl,
      kind
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to upload image." },
      { status: 500 }
    );
  }
}
