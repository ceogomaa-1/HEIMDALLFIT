"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase";
import { MorphingSquare } from "./ui/morphing-square";

export function CoachAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [status, setStatus] = useState<"checking" | "allowed" | "redirecting">("checking");

  useEffect(() => {
    if (pathname === "/coach/auth") {
      setStatus("allowed");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setStatus("redirecting");
      router.replace(`/coach/auth?next=${encodeURIComponent(pathname || "/coach")}` as never);
      return;
    }

    let mounted = true;

    const checkRole = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        setStatus("redirecting");
        router.replace(`/coach/auth?next=${encodeURIComponent(pathname || "/coach")}` as never);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.session.user.id).maybeSingle();

      if ((profile as { role?: string } | null)?.role === "coach") {
        setStatus("allowed");
      } else {
        await supabase.auth.signOut();
        setStatus("redirecting");
        router.replace(`/coach/auth?next=${encodeURIComponent(pathname || "/coach")}` as never);
      }
    };

    checkRole();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(async ({ data: profile }) => {
            if (!mounted) return;
            if ((profile as { role?: string } | null)?.role === "coach") {
              setStatus("allowed");
            } else {
              await supabase.auth.signOut();
              setStatus("redirecting");
              router.replace(`/coach/auth?next=${encodeURIComponent(pathname || "/coach")}` as never);
            }
          });
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  if (status === "allowed") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050506] text-white">
      <MorphingSquare message="Securing coach access..." />
    </div>
  );
}
