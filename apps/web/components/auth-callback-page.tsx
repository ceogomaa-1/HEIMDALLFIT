"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { MorphingSquare } from "./ui/morphing-square";

function parseHashValue(hash: string, key: string) {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return params.get(key);
}

export function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/coach";
  const portal = searchParams.get("portal") === "client" ? "client" : "coach";
  const inviteToken = searchParams.get("invite");
  const roomId = searchParams.get("roomId");
  const supabase = useMemo(() => getSupabaseBrowserClient(portal), [portal]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState(
    portal === "client" ? "Confirming your client access..." : "Confirming your coach access..."
  );

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const error = parseHashValue(hash, "error");
    const errorDescription = parseHashValue(hash, "error_description");

    if (error) {
      setStatus("error");
      setMessage(decodeURIComponent(errorDescription || "This confirmation link is invalid or has expired."));
      return;
    }

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured.");
      return;
    }

    let mounted = true;

    const finishAuth = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        const response = await fetch("/api/auth/bootstrap-portal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`
          },
          body: JSON.stringify({
            portal,
            inviteToken,
            roomId
          })
        });
        const payload = await response.json();

        if (!mounted) return;

        if (!response.ok) {
          await supabase.auth.signOut();
          setStatus("error");
          setMessage(payload.error || "We could not prepare this account for the selected portal.");
          return;
        }

        setStatus("done");
        setMessage(
          portal === "client"
            ? "Client access confirmed. Taking you to the dashboard..."
            : "Coach access confirmed. Taking you to the dashboard..."
        );
        setTimeout(() => router.replace(nextPath as never), 900);
      } else {
        setStatus("error");
        setMessage("We could not finalize your session. Please log in again.");
      }
    };

    finishAuth();

    return () => {
      mounted = false;
    };
  }, [inviteToken, nextPath, portal, roomId, router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050506] px-6 text-white">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          {portal === "client" ? "Client Auth Callback" : "Coach Auth Callback"}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
          {status === "error" ? "Access link issue." : "Finishing sign in."}
        </h1>
        <p className="mt-4 text-sm text-white/65">{message}</p>
        {status !== "error" ? (
          <div className="mt-8 flex justify-center">
            <MorphingSquare message="Authorizing..." />
          </div>
        ) : null}
        {status === "error" ? (
          <div className="mt-8">
            <Link
              href={portal === "client" ? "/client/auth" : "/coach/auth"}
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {portal === "client" ? "Back to Client Auth" : "Back to Coach Auth"}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
