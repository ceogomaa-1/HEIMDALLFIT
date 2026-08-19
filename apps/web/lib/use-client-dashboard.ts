"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase";

export type ClientDashboardData = {
  profile: { id: string; name: string; handle: string; role: string; avatar: string | null };
  linkedCoach: {
    name: string;
    specialty: string;
    bio: string;
    avatar: string | null;
    banner: string | null;
    roomId: string;
    roomName: string;
    tagline: string;
  } | null;
  stats: {
    membershipStatus: string;
    joinedDate: string;
    currentWeight: string;
    assignedPrograms: number;
    storeItems: number;
  };
  programs: Array<{ id: string; title: string; sport: string; createdAt: string }>;
  store: Array<{ id: string; title: string; subtitle: string; priceLabel: string; image: string | null; type: string }>;
  notifications: string[];
};

export function useClientDashboard(nextPath: string) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient("client"), []);
  const [data, setData] = useState<ClientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for the client portal.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.access_token) {
        router.replace(`/client/auth?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const { data: profileRole } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if ((profileRole as { role?: string } | null)?.role === "coach") {
        await supabase.auth.signOut();
        router.replace(`/client/auth?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      try {
        const response = await fetch("/api/client/dashboard", {
          headers: { authorization: `Bearer ${session.access_token}` },
          cache: "no-store"
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load your client portal.");
        if (active) setData(payload as ClientDashboardData);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your client portal.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [nextPath, router, supabase]);

  return { data, error, loading };
}
