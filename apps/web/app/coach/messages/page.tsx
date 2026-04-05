"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CoachShell } from "../../../components/coach-shell";
import { MessagesWorkspace } from "../../../components/messages-workspace";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";

export default function CoachMessagesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [profile, setProfile] = useState({
    name: "Coach",
    handle: "@coach",
    role: "Coach",
    avatar: null as string | null
  });
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for the coach portal.");
        setChecking(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/coach/auth?next=%2Fcoach%2Fmessages");
        return;
      }

      const { data: profileRole } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if ((profileRole as { role?: string } | null)?.role === "client") {
        await supabase.auth.signOut();
        router.replace("/coach/auth?next=%2Fcoach%2Fmessages");
        return;
      }

      if (!active) return;
      setProfile({
        name:
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
          user.email?.split("@")[0] ||
          "Coach",
        handle: user.email ? `@${user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@coach",
        role: "Coach",
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
    <CoachShell profile={profile}>
      {checking ? (
        <div className="grid h-full min-h-[520px] flex-1 grid-cols-[320px_minmax(0,1fr)] gap-0 overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--bg-surface)]">
          <div className="flex flex-col gap-4 p-5">
            <div className="skeleton h-11 rounded-[14px]" />
            <div className="skeleton h-20 rounded-[18px]" />
            <div className="skeleton h-20 rounded-[18px]" />
            <div className="skeleton h-20 rounded-[18px]" />
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="skeleton h-14 rounded-[16px]" />
            <div className="skeleton flex-1 rounded-[22px]" />
            <div className="skeleton h-14 rounded-[16px]" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[24px] border border-[#2b2b34] bg-[#18181f] px-5 py-4 text-sm text-red-300">{error}</div>
      ) : supabase ? (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <MessagesWorkspace
            portal="coach"
            supabase={supabase}
            emptyTitle="No client threads yet."
            emptyCopy="As soon as a client joins your room, their private HEIMDALLFIT thread will appear here."
          />
        </div>
      ) : null}
    </CoachShell>
  );
}
