"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, ShieldCheck, Sparkles, UserRoundPlus } from "lucide-react";
import { CoachShell } from "../../../components/coach-shell";
import { GlassPanel } from "../../../components/glass";
import { MorphingSquare } from "../../../components/ui/morphing-square";
import { SlideButton } from "../../../components/ui/slide-button";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";
import type { CoachDashboardProfile } from "../../../lib/coach-dashboard-types";

type InviteRecord = {
  id: string;
  clientName: string;
  clientEmail: string;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
};

type OnboardingResponse = {
  profile: CoachDashboardProfile;
  invites: InviteRecord[];
};

function formatDateTime(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function CoachOnboardingPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<CoachDashboardProfile | null>(null);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("Welcome to HEIMDALLFIT!");
  const [coachMessage, setCoachMessage] = useState(
    "Your coach is waiting for you in the room. Once you sign up, reply inside HEIMDALLFIT so we can get started right away."
  );
  const [buttonKey, setButtonKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for onboarding.");
        setLoading(false);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Coach session missing. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const [dashboardResponse, invitesResponse] = await Promise.all([
          fetch("/api/coach/dashboard", {
            headers: { Authorization: `Bearer ${session.access_token}` }
          }),
          fetch("/api/coach/invites", {
            headers: { Authorization: `Bearer ${session.access_token}` }
          })
        ]);

        const dashboardPayload = await dashboardResponse.json();
        const invitesPayload = await invitesResponse.json();

        if (!dashboardResponse.ok) {
          throw new Error(dashboardPayload.error || "Unable to load onboarding page.");
        }

        if (!invitesResponse.ok) {
          throw new Error(invitesPayload.error || "Unable to load sent invites.");
        }

        if (!active) return;
        setProfile(dashboardPayload.profile);
        setInvites(invitesPayload.invites || []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load onboarding page.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const shellProfile = profile || {
    name: loading ? "Loading coach..." : "Coach",
    handle: "@coach",
    role: "Coach",
    avatar: null
  };

  const sendInvite = async () => {
    setError(null);
    setMessage(null);
    try {
      if (!clientName.trim()) {
        throw new Error("Client name is required.");
      }

      if (!clientEmail.trim()) {
        throw new Error("Client email is required.");
      }

      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Coach session missing. Please log in again.");
      }

      const response = await fetch("/api/coach/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          clientName,
          clientEmail,
          subject: emailSubject,
          coachMessage
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to send onboarding invite.");
      }

      setInvites((current) => [payload.invite, ...current]);
      setMessage(`Invite sent to ${clientEmail}.`);
      setClientName("");
      setClientEmail("");
      setButtonKey((current) => current + 1);
    } catch (inviteError) {
      const messageText =
        inviteError instanceof Error ? inviteError.message : "Unable to send onboarding invite.";
      setError(messageText);
      throw inviteError;
    }
  };

  return (
    <CoachShell profile={shellProfile}>
      <div className="portal-page flex min-h-full flex-col gap-5 pb-4">
        <section className="flex flex-col gap-3 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent)]">Coach onboarding</p>
            <h1 className="mt-2 font-display text-[2.3rem] font-bold tracking-[-0.05em] text-white">Onboard a new Client</h1>
            <p className="mt-3 max-w-[680px] text-[14px] leading-7 text-[var(--text-secondary)]">
              Send a professional HEIMDALLFIT invite with your real room code so the client lands directly inside your ecosystem.
            </p>
          </div>
          {profile?.roomId ? (
            <div className="rounded-[18px] border border-[rgba(0,163,255,0.18)] bg-[rgba(0,163,255,0.08)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Room Code: <span className="font-semibold text-white">{profile.roomId}</span>
            </div>
          ) : null}
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <MorphingSquare message="Loading onboarding..." />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <GlassPanel className="p-6">
              <div className="flex items-center gap-3 border-b border-white/[0.06] pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white/75">
                  <UserRoundPlus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">Invite Flow</h2>
                  <p className="text-[13px] text-[var(--text-secondary)]">Enter the client basics and send their access immediately.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="space-y-2 text-sm text-white/70">
                  <span>Client Name</span>
                  <input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Client full name"
                    className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white outline-none transition"
                  />
                </label>

                <label className="space-y-2 text-sm text-white/70">
                  <span>Client Email</span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(event) => setClientEmail(event.target.value)}
                    placeholder="client@email.com"
                    className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white outline-none transition"
                  />
                </label>

                <label className="space-y-2 text-sm text-white/70">
                  <span>Email Subject</span>
                  <input
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Welcome to HEIMDALLFIT!"
                    className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white outline-none transition"
                  />
                </label>

                <label className="space-y-2 text-sm text-white/70">
                  <span>Coach Message</span>
                  <textarea
                    value={coachMessage}
                    onChange={(event) => setCoachMessage(event.target.value)}
                    rows={5}
                    placeholder="Add a personal note for this client."
                    className="w-full resize-none rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white outline-none transition"
                  />
                </label>

                <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(0,163,255,0.06),rgba(255,255,255,0.03))] p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">Email Preview</p>
                  <p className="mt-3 text-sm font-semibold text-white">{emailSubject || "Welcome to HEIMDALLFIT!"}</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-white/65">
                    <p>
                      Welcome to HEIMDALLFIT! Your coach <span className="font-semibold text-white">{profile?.brandName || profile?.name}</span> is waiting for you in their room.
                    </p>
                    <p>
                      This is your room code: <span className="font-semibold text-white">{profile?.roomId || "--------"}</span>
                    </p>
                    <p className="text-amber-200/80">
                      DO NOT SHARE THIS ROOM CODE WITH OTHER PEOPLE WITHOUT YOUR COACH APPROVAL FIRST.
                    </p>
                    {coachMessage.trim() ? (
                      <div className="rounded-[18px] border border-white/[0.08] bg-black/20 px-4 py-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-ghost)]">Message From Your Coach</p>
                        <p className="mt-2 whitespace-pre-line text-white/78">{coachMessage}</p>
                      </div>
                    ) : null}
                    <p>Press the access link to create your client account and enter your new dashboard.</p>
                  </div>
                </div>

                {message ? <p className="text-sm text-[#53d78e]">{message}</p> : null}
                {error ? <p className="text-sm text-red-300">{error}</p> : null}

                <div className="pt-2">
                  <SlideButton
                    key={buttonKey}
                    label="Slide to send invite"
                    successLabel="Invite sent"
                    errorLabel="Send failed"
                    onComplete={sendInvite}
                  />
                </div>
              </div>
            </GlassPanel>

            <div className="grid gap-4">
              <GlassPanel className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white/72">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-white">What happens next</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">The client receives the invite, signs up, and gets connected to your room.</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    "Client receives a branded HEIMDALLFIT email.",
                    "Invite link lands them on the client auth flow.",
                    "Their account attaches to your room after auth.",
                    "Messaging and onboarding form plug into that relationship next."
                  ].map((item) => (
                    <div key={item} className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {item}
                    </div>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white/72">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-white">Recent Invites</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">Track which clients have already been invited into your room.</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {invites.length ? (
                    invites.map((invite) => (
                      <div key={invite.id} className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition hover:border-white/[0.12] hover:bg-white/[0.05]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{invite.clientName}</p>
                            <p className="mt-1 text-xs text-white/42">{invite.clientEmail}</p>
                          </div>
                          <span className="rounded-full border border-[rgba(67,208,127,0.25)] bg-[rgba(67,208,127,0.12)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5de498]">
                            {invite.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[12px] text-white/45">
                          <span>Sent: {formatDateTime(invite.createdAt)}</span>
                          <span>Accepted: {formatDateTime(invite.acceptedAt)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-6 text-sm text-white/48">
                      No invites sent yet. Your next invite becomes the first client entry in this list.
                    </div>
                  )}
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white/72">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-white">Client Entry Promise</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">No switching apps. No WhatsApp dependency. Everything starts here.</p>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        )}
      </div>
    </CoachShell>
  );
}
