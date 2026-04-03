import type { SupabaseClient } from "@supabase/supabase-js";

const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

export function isExternalUrl(value: string | null | undefined) {
  return Boolean(value && EXTERNAL_URL_PATTERN.test(value));
}

export async function resolveStorageAssetUrl(
  supabase: SupabaseClient,
  bucket: string,
  value: string | null | undefined,
  expiresIn = 60 * 60 * 24 * 30
) {
  if (!value) return null;
  if (isExternalUrl(value)) return value;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(value, expiresIn);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
