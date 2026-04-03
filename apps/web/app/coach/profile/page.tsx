"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Copy, ExternalLink, ImagePlus, LoaderCircle, Save, UserCircle2 } from "lucide-react";
import { CoachShell } from "../../../components/coach-shell";
import { GlassPanel } from "../../../components/glass";
import { MorphingSquare } from "../../../components/ui/morphing-square";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";
import type { CoachProfileResponse } from "../../../lib/coach-profile-types";

type ProfileForm = {
  fullName: string;
  avatarPath: string;
  bannerPath: string;
  brandName: string;
  specialty: string;
  bio: string;
  roomName: string;
  brandTagline: string;
};

function toFormState(profile: CoachProfileResponse): ProfileForm {
  return {
    fullName: profile.fullName,
    avatarPath: profile.avatarPath || "",
    bannerPath: profile.bannerPath || "",
    brandName: profile.brandName,
    specialty: profile.specialty,
    bio: profile.bio,
    roomName: profile.roomName,
    brandTagline: profile.brandTagline
  };
}

export default function CoachProfilePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [profile, setProfile] = useState<CoachProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for profile editing.");
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
        const response = await fetch("/api/coach/profile", {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load profile.");
        }

        if (!active) return;
        setProfile(payload);
        setForm(toFormState(payload));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load profile.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [supabase]);

  const shellProfile = profile
    ? {
        name: profile.fullName,
        handle: profile.handle,
        role: profile.brandName,
        avatar: profile.avatarUrl
      }
    : {
        name: loading ? "Loading coach..." : "Coach",
        handle: "@coach",
        role: "Coach",
        avatar: null
      };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleImageUpload = async (kind: "avatar" | "banner", file: File | null) => {
    if (!file || !supabase) return;

    setError(null);
    setMessage(null);
    setUploading(kind);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Coach session missing. Please log in again.");
      }

      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);

      const response = await fetch("/api/coach/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to upload image.");
      }

      setForm((current) =>
        current
          ? {
              ...current,
              [kind === "avatar" ? "avatarPath" : "bannerPath"]: payload.path
            }
          : current
      );

      setProfile((current) =>
        current
          ? {
              ...current,
              [kind === "avatar" ? "avatarPath" : "bannerPath"]: payload.path,
              [kind === "avatar" ? "avatarUrl" : "bannerUrl"]: payload.url
            }
          : current
      );

      setMessage(kind === "avatar" ? "Profile photo updated." : "Banner updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.");
    } finally {
      setUploading(null);
      if (kind === "avatar" && avatarInputRef.current) avatarInputRef.current.value = "";
      if (kind === "banner" && bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form || !supabase) return;

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Coach session missing. Please log in again.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/coach/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...form,
          avatarPath: form.avatarPath || null,
          bannerPath: form.bannerPath || null
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save profile.");
      }

      setProfile(payload);
      setForm(toFormState(payload));
      setMessage("Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const copyRoomId = async () => {
    if (!profile?.roomId) return;
    await navigator.clipboard.writeText(profile.roomId);
    setMessage("Room ID copied.");
  };

  return (
    <CoachShell profile={shellProfile}>
      <div className="flex min-h-full flex-col gap-4 pb-4">
        <section className="flex flex-col gap-3 border-b border-[#232329] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[13px] text-white/45">Coach workspace</p>
            <h1 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.05em] text-white">My Profile</h1>
            <p className="mt-2 text-[13px] text-white/45">
              Configure your public coach identity, brand, and room details.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyRoomId}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[#2a2a31] bg-[#17171d] px-4 py-2.5 text-[13px] text-white/72 transition hover:bg-[#1d1d25]"
            >
              <Copy className="h-4 w-4" />
              Copy Room ID
            </button>
            <a
              href="/coach"
              className="inline-flex items-center gap-2 rounded-full border border-[#2a2a31] bg-[#17171d] px-4 py-2.5 text-[13px] text-white/72 transition hover:bg-[#1d1d25]"
            >
              <ExternalLink className="h-4 w-4" />
              Dashboard
            </a>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <MorphingSquare message="Loading profile..." />
          </div>
        ) : form ? (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#24242b] pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#202028] text-white/78">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-[1.25rem] font-semibold tracking-[-0.04em] text-white">Coach Identity</h2>
                    <p className="text-[13px] text-white/45">These fields power the dashboard, room, and client-facing presence.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-white/70">
                    <span>Full Name</span>
                    <input
                      value={form.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      className="w-full rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-white outline-none transition focus:border-white/20"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/70">
                    <span>Brand Name</span>
                    <input
                      value={form.brandName}
                      onChange={(event) => updateField("brandName", event.target.value)}
                      className="w-full rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-white outline-none transition focus:border-white/20"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/70">
                    <span>Specialty</span>
                    <input
                      value={form.specialty}
                      onChange={(event) => updateField("specialty", event.target.value)}
                      className="w-full rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-white outline-none transition focus:border-white/20"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 text-sm text-white/70">
                    <span>Profile Photo</span>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleImageUpload("avatar", event.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploading === "avatar"}
                      className="flex w-full items-center justify-between rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-left text-white transition hover:bg-[#262630] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="flex items-center gap-3">
                        <Camera className="h-4 w-4 text-white/60" />
                        <span>{uploading === "avatar" ? "Uploading profile photo..." : "Upload profile picture"}</span>
                      </span>
                      {uploading === "avatar" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm text-white/70">
                    <span>Banner Photo</span>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleImageUpload("banner", event.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploading === "banner"}
                      className="flex w-full items-center justify-between rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-left text-white transition hover:bg-[#262630] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="flex items-center gap-3">
                        <ImagePlus className="h-4 w-4 text-white/60" />
                        <span>{uploading === "banner" ? "Uploading banner..." : "Upload banner picture"}</span>
                      </span>
                      {uploading === "banner" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    </button>
                  </div>
                </div>

                <label className="space-y-2 text-sm text-white/70">
                  <span>Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    rows={5}
                    className="w-full rounded-[22px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-white outline-none transition focus:border-white/20"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-white/70">
                    <span>Room Name</span>
                    <input
                      value={form.roomName}
                      onChange={(event) => updateField("roomName", event.target.value)}
                      className="w-full rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-white outline-none transition focus:border-white/20"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/70">
                    <span>Brand Tagline</span>
                    <input
                      value={form.brandTagline}
                      onChange={(event) => updateField("brandTagline", event.target.value)}
                      className="w-full rounded-[18px] border border-[#2b2b34] bg-[#202028] px-4 py-3 text-white outline-none transition focus:border-white/20"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                  {message ? <p className="text-sm text-[#53d78e]">{message}</p> : null}
                  {error ? <p className="text-sm text-red-300">{error}</p> : null}
                </div>
              </form>
            </GlassPanel>

            <GlassPanel className="border-[#24242b] bg-[#1a1a20] p-5">
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[#2b2b34] bg-[#202028] p-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/32">Live Preview</p>
                  <div className="mt-4 overflow-hidden rounded-[22px] border border-[#2b2b34] bg-[#18181f]">
                    <div className="relative h-40 w-full">
                      {profile?.bannerUrl ? (
                        <img src={profile.bannerUrl} alt={`${form.brandName} banner`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(90,20,20,0.45),transparent_30%),linear-gradient(135deg,#18181f,#24242c)]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#14141a] via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-end gap-4">
                        {profile?.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={form.fullName} className="h-20 w-20 rounded-full border-4 border-[#14141a] object-cover" />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#14141a] bg-white text-lg font-semibold text-black">
                            {profile?.fullName
                              ?.split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() || "")
                              .join("") || "C"}
                          </div>
                        )}
                        <div className="pb-1">
                          <h3 className="text-xl font-semibold text-white">{form.fullName}</h3>
                          <p className="text-sm text-white/45">{profile?.handle}</p>
                          <p className="mt-1 text-sm text-white/60">{form.brandName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/55">{form.bio || "Your coach bio will appear here once saved."}</p>
                </div>

                <div className="rounded-[24px] border border-[#2b2b34] bg-[#202028] p-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/32">Room Details</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/45">Room ID</span>
                      <span className="font-semibold text-white">{profile?.roomId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/45">Room Name</span>
                      <span className="font-semibold text-white">{form.roomName}</span>
                    </div>
                    <div className="rounded-[18px] border border-[#2b2b34] bg-[#18181f] px-4 py-3 text-white/60">
                      {form.brandTagline}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#2b2b34] bg-[#202028] p-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/32">Quick Actions</p>
                  <div className="mt-4 grid gap-3">
                    <button
                      onClick={copyRoomId}
                      type="button"
                      className="rounded-[18px] border border-[#2b2b34] bg-[#18181f] px-4 py-3 text-left text-sm text-white/72 transition hover:bg-[#202028]"
                    >
                      Copy room ID for sharing
                    </button>
                    <a
                      href="/coach"
                      className="rounded-[18px] border border-[#2b2b34] bg-[#18181f] px-4 py-3 text-left text-sm text-white/72 transition hover:bg-[#202028]"
                    >
                      Return to coach dashboard
                    </a>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center">
            <MorphingSquare message="Preparing profile..." />
          </div>
        )}
      </div>
    </CoachShell>
  );
}
