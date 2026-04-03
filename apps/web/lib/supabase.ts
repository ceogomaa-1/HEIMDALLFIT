import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const browserClients = new Map<string, ReturnType<typeof createClient>>();

export type BrowserPortal = "coach" | "client" | "shared";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function getStorageKey(portal: BrowserPortal) {
  if (portal === "coach") return "heimdallfit-coach-auth";
  if (portal === "client") return "heimdallfit-client-auth";
  return "heimdallfit-shared-auth";
}

export function getSupabaseBrowserClient(portal: BrowserPortal = "shared") {
  if (!isSupabaseConfigured) {
    return null;
  }

  const storageKey = getStorageKey(portal);

  if (!browserClients.has(storageKey)) {
    browserClients.set(
      storageKey,
      createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey
      }
      })
    );
  }

  return browserClients.get(storageKey)!;
}
