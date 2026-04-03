"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientShell } from "../../../components/client-shell";
import { MessagesWorkspace } from "../../../components/messages-workspace";
import { MorphingSquare } from "../../../components/ui/morphing-square";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";

export default function ClientMessagesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient("client"), []);
  const [profile, setProfile] = useState({
    name: "Client",
    handle: "@client",
    role: "Client",
    avatar: null as string | null
  });
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for the client portal.");
        setChecking(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/client/auth?next=%2Fclient%2Fmessages");
        return;
      }

      const { data: profileRole } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if ((profileRole as { role?: string } | null)?.role === "coach") {
        await supabase.auth.signOut();
        router.replace("/client/auth?next=%2Fclient%2Fmessages");
        return;
      }

      if (!active) return;
      setProfile({
        name:
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
          user.email?.split("@")[0] ||
          "Client",
        handle: user.email ? `@${user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@client",
        role: "Client",
        avatar: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null
      });
      setChecking(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  return (
    <ClientShell profile={profile}>
      {checking ? (
        <div className="flex min-h-[520px] items-center justify-center">
          <MorphingSquare message="Loading messages..." />
        </div>
      ) : error ? (
        <div className="rounded-[24px] border border-[#2b2b34] bg-[#18181f] px-5 py-4 text-sm text-red-300">{error}</div>
      ) : supabase ? (
        <MessagesWorkspace
          portal="client"
          supabase={supabase}
          emptyTitle="No coach thread yet."
          emptyCopy="Once you join a coach room, your private HEIMDALLFIT thread will appear here automatically."
        />
      ) : null}
    </ClientShell>
  );
}
