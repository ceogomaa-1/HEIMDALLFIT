"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Camera, Copy, ExternalLink, ImagePlus, LoaderCircle, Plus, Save, Trash2, Trophy, UserCircle2 } from "lucide-react";
import { CoachShell } from "../../../components/coach-shell";
import { GlassPanel } from "../../../components/glass";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";
import type { CoachProfileAchievement, CoachProfileGalleryItem, CoachProfileResponse } from "../../../lib/coach-profile-types";

type ProfileForm = {
  fullName: string;
  avatarPath: string;
  bannerPath: string;
  brandName: string;
  specialty: string;
  bio: string;
  roomName: string;
  brandTagline: string;
  gallery: CoachProfileGalleryItem[];
  achievements: CoachProfileAchievement[];
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
    brandTagline: profile.brandTagline,
    gallery: profile.gallery,
    achievements: profile.achievements
  };
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CoachProfilePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [profile, setProfile] = useState<CoachProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | "gallery" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

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
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load profile.");
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

  const updateGalleryItem = (id: string, patch: Partial<CoachProfileGalleryItem>) => {
    setForm((current) =>
      current
        ? {
            ...current,
            gallery: current.gallery.map((item) => (item.id === id ? { ...item, ...patch } : item))
          }
        : current
    );
  };

  const removeGalleryItem = (id: string) => {
    setForm((current) =>
      current
        ? {
            ...current,
            gallery: current.gallery.filter((item) => item.id !== id)
          }
        : current
    );
  };

  const addAchievement = () => {
    setForm((current) =>
      current
        ? {
            ...current,
            achievements: [
              ...current.achievements,
              { id: createId("achievement"), title: "", issuer: "", year: "", category: "Certification" }
            ]
          }
        : current
    );
  };

  const updateAchievement = (id: string, patch: Partial<CoachProfileAchievement>) => {
    setForm((current) =>
      current
        ? {
            ...current,
            achievements: current.achievements.map((item) => (item.id === id ? { ...item, ...patch } : item))
          }
        : current
    );
  };

  const removeAchievement = (id: string) => {
    setForm((current) =>
      current
        ? {
            ...current,
            achievements: current.achievements.filter((item) => item.id !== id)
          }
        : current
    );
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

      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");

      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);

      const response = await fetch("/api/coach/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to upload image.");

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
          bannerPath: form.bannerPath || null,
          gallery: form.gallery.map((item) => ({ id: item.id, path: item.path, caption: item.caption })),
          achievements: form.achievements
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save profile.");
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

  const fieldClass =
    "w-full rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white outline-none transition-all duration-200 placeholder:text-[var(--text-ghost)]";

  const handleGalleryUpload = async (file: File | null) => {
    if (!file || !supabase) return;
    setError(null);
    setMessage(null);
    setUploading("gallery");

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");

      const formData = new FormData();
      formData.append("kind", "gallery");
      formData.append("file", file);

      const response = await fetch("/api/coach/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to upload gallery image.");

      setForm((current) =>
        current
          ? {
              ...current,
              gallery: [
                {
                  id: createId("gallery"),
                  path: payload.path,
                  url: payload.url,
                  caption: ""
                },
                ...current.gallery
              ].slice(0, 9)
            }
          : current
      );
      setMessage("Marketplace photo added.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload gallery image.");
    } finally {
      setUploading(null);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  return (
    <CoachShell profile={shellProfile}>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-4 pr-1">
        <section className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">Coach workspace</p>
            <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.8rem)] font-bold tracking-[-0.05em] text-white">My Profile</h1>
            <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
              Configure your public coach identity, brand, and room details.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyRoomId}
              type="button"
              className="rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--text-secondary)] transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copy Room ID
              </span>
            </button>
            <a
              href="/coach"
              className="rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--text-secondary)] transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Dashboard
              </span>
            </a>
          </div>
        </section>

        {loading ? (
          <div className="grid min-h-[420px] gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="skeleton rounded-[28px]" />
            <div className="grid gap-5">
              <div className="skeleton rounded-[28px]" />
              <div className="skeleton rounded-[28px]" />
              <div className="skeleton rounded-[28px]" />
            </div>
          </div>
        ) : form ? (
          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <GlassPanel className="animate-fade-up p-0">
              <form onSubmit={handleSave}>
                <div
                  style={{
                    height: "180px",
                    borderRadius: "20px 20px 0 0",
                    background: "linear-gradient(135deg, rgba(0,163,255,0.20) 0%, rgba(67,208,127,0.10) 50%, rgba(0,0,0,0.2) 100%)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {profile?.bannerUrl ? (
                    <img src={profile.bannerUrl} alt={`${form.brandName} banner`} className="h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute -left-10 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(0,163,255,0.16),transparent_70%)] animate-[orb-drift_10s_ease-in-out_infinite]" />
                  <div className="absolute bottom-4 right-4">
                    <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload("banner", event.target.files?.[0] || null)} />
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploading === "banner"}
                      className="rounded-[12px] border border-white/10 bg-black/25 px-4 py-2.5 text-[13px] text-white backdrop-blur-md transition hover:bg-black/40 disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        <ImagePlus className="h-4 w-4" />
                        {uploading === "banner" ? "Uploading..." : "Change banner"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-6" style={{ position: "relative" }}>
                  <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleGalleryUpload(event.target.files?.[0] || null)} />
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      border: "3px solid rgba(0,163,255,0.5)",
                      boxShadow: "0 0 20px rgba(0,163,255,0.3)",
                      marginTop: "-40px",
                      background: "linear-gradient(135deg, rgba(0,163,255,0.3), rgba(67,208,127,0.2))"
                    }}
                    className="relative overflow-hidden"
                  >
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={form.fullName} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-lg font-semibold text-white">
                        {profile?.fullName
                          ?.split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() || "")
                          .join("") || "C"}
                      </div>
                    )}
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload("avatar", event.target.files?.[0] || null)} />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploading === "avatar"}
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 disabled:opacity-60"
                    >
                      {uploading === "avatar" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <span>Full Name</span>
                      <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} className={fieldClass} />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <span>Brand Name</span>
                      <input value={form.brandName} onChange={(event) => updateField("brandName", event.target.value)} className={fieldClass} />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <span>Specialty</span>
                      <input value={form.specialty} onChange={(event) => updateField("specialty", event.target.value)} className={fieldClass} />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <span>Room Name</span>
                      <input value={form.roomName} onChange={(event) => updateField("roomName", event.target.value)} className={fieldClass} />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-secondary)] md:col-span-2">
                      <span>Brand Tagline</span>
                      <input value={form.brandTagline} onChange={(event) => updateField("brandTagline", event.target.value)} className={fieldClass} />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-secondary)] md:col-span-2">
                      <span>Bio</span>
                      <textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows={6} className={`${fieldClass} min-h-[150px] resize-none`} />
                    </label>
                  </div>

                  <div className="mt-8 rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-5">
                    <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-ghost)]">Marketplace Gallery</p>
                        <h3 className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.04em] text-white">Profile highlights</h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">Add photos that preview your coaching style inside the coach marketplace.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={uploading === "gallery"}
                        className="rounded-[14px] border border-[var(--border-accent)] bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-medium text-[var(--accent-bright)] transition hover:bg-[rgba(37,99,235,0.18)] disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ImagePlus className="h-4 w-4" />
                          {uploading === "gallery" ? "Uploading..." : "Add marketplace photo"}
                        </span>
                      </button>
                    </div>

                    {form.gallery.length ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {form.gallery.map((item) => (
                          <div key={item.id} className="overflow-hidden rounded-[18px] border border-white/[0.07] bg-[rgba(12,12,20,0.88)]">
                            <div className="relative h-40 bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(16,185,129,0.08))]">
                              {item.url ? <img src={item.url} alt={item.caption || "Marketplace preview"} className="h-full w-full object-cover" /> : null}
                              <button
                                type="button"
                                onClick={() => removeGalleryItem(item.id)}
                                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white transition hover:bg-black/70"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="p-4">
                              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-ghost)]">Caption</p>
                              <input
                                value={item.caption}
                                onChange={(event) => updateGalleryItem(item.id, { caption: event.target.value })}
                                placeholder="Boxing session, podium moment, gym floor..."
                                className={`${fieldClass} mt-2`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-[18px] border border-dashed border-white/[0.10] bg-white/[0.02] px-5 py-10 text-center text-sm text-[var(--text-secondary)]">
                        No marketplace photos yet. Add a few clean visuals so clients instantly understand your style.
                      </div>
                    )}
                  </div>

                  <div className="mt-8 rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-5">
                    <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-ghost)]">Authority Stack</p>
                        <h3 className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.04em] text-white">Certifications, awards, medals, titles, trophies</h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">Show clients the receipts behind your coaching reputation.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addAchievement}
                        className="rounded-[14px] border border-white/[0.10] bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/[0.16] hover:bg-white/[0.09]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add achievement
                        </span>
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {form.achievements.length ? (
                        form.achievements.map((item) => (
                          <div key={item.id} className="rounded-[18px] border border-white/[0.07] bg-[rgba(12,12,20,0.88)] p-4">
                            <div className="mb-4 flex items-center justify-between">
                              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.10)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber)]">
                                <Trophy className="h-3.5 w-3.5" />
                                credibility item
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAchievement(item.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                                <span>Title</span>
                                <input value={item.title} onChange={(event) => updateAchievement(item.id, { title: event.target.value })} placeholder="IBJJF Gold Medalist" className={fieldClass} />
                              </label>
                              <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                                <span>Category</span>
                                <input value={item.category} onChange={(event) => updateAchievement(item.id, { category: event.target.value })} placeholder="Medal / Certification / Award" className={fieldClass} />
                              </label>
                              <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                                <span>Issuer</span>
                                <input value={item.issuer} onChange={(event) => updateAchievement(item.id, { issuer: event.target.value })} placeholder="Organization / Event" className={fieldClass} />
                              </label>
                              <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                                <span>Year</span>
                                <input value={item.year} onChange={(event) => updateAchievement(item.id, { year: event.target.value })} placeholder="2025" className={fieldClass} />
                              </label>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-white/[0.10] bg-white/[0.02] px-5 py-10 text-center text-sm text-[var(--text-secondary)]">
                          No credibility items yet. Add your strongest certifications, medals, titles, and awards here.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        padding: "11px 24px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, var(--accent), rgba(0,163,255,0.75))",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0,163,255,0.35)"
                      }}
                      className="transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_8px_28px_rgba(0,163,255,0.5)] disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Profile"}
                      </span>
                    </button>
                    {message ? <p className="text-sm text-[var(--green)]">{message}</p> : null}
                    {error ? <p className="text-sm text-red-300">{error}</p> : null}
                  </div>
                </div>
              </form>
            </GlassPanel>

            <div className="grid gap-5">
              <GlassPanel className="animate-fade-up stagger-2 overflow-hidden p-0">
                <div className="p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--text-ghost)]">Live Preview</p>
                </div>
                <div className="mx-5 mb-5 overflow-hidden rounded-[22px] border border-white/[0.07] bg-[rgba(12,12,20,0.9)]">
                  <div
                    style={{
                      height: "180px",
                      background: "linear-gradient(135deg, rgba(0,163,255,0.20) 0%, rgba(67,208,127,0.10) 50%, rgba(0,0,0,0.2) 100%)",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    {profile?.bannerUrl ? (
                      <img src={profile.bannerUrl} alt={`${form.brandName} banner`} className="h-full w-full object-cover" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12131a] via-transparent to-transparent" />
                  </div>
                  <div className="px-5 pb-5" style={{ position: "relative" }}>
                    <div className="-mt-10 flex items-end gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-[rgba(0,163,255,0.5)] bg-[linear-gradient(135deg,rgba(0,163,255,0.3),rgba(67,208,127,0.2))] shadow-[0_0_20px_rgba(0,163,255,0.3)]">
                        {profile?.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={form.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-mono text-lg font-semibold text-white">
                            {profile?.fullName
                              ?.split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() || "")
                              .join("") || "C"}
                          </div>
                        )}
                      </div>
                      <div className="pb-2">
                        <h3 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {form.fullName}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)]">{profile?.handle}</p>
                        <p className="mt-1 text-sm text-white/70">{form.brandName}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                      {form.bio || "Your coach bio will appear here once saved."}
                    </p>
                    <div className="mt-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-ghost)]">Marketplace photos</p>
                      {form.gallery.length ? (
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          {form.gallery.slice(0, 3).map((item) => (
                            <div key={item.id} className="overflow-hidden rounded-[16px] border border-white/[0.07] bg-white/[0.03]">
                              <div className="h-24 bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(16,185,129,0.08))]">
                                {item.url ? <img src={item.url} alt={item.caption || "Marketplace photo"} className="h-full w-full object-cover" /> : null}
                              </div>
                              <div className="px-3 py-2 text-[11px] text-[var(--text-secondary)]">{item.caption || "Marketplace preview"}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[16px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-sm text-[var(--text-secondary)]">
                          Add profile photos to make the marketplace card feel alive.
                        </div>
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-ghost)]">Certifications & titles</p>
                      {form.achievements.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {form.achievements.slice(0, 6).map((item) => (
                            <div key={item.id} className="rounded-full border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.10)] px-3 py-1.5 text-[11px] text-[var(--amber)]">
                              {item.title}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[16px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-sm text-[var(--text-secondary)]">
                          Add your certifications, medals, titles, or awards to boost marketplace trust.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel className="animate-fade-up stagger-3 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--text-ghost)]">Room Details</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Room ID</span>
                    <span className="font-semibold text-white">{profile?.roomId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Room Name</span>
                    <span className="font-semibold text-white">{form.roomName}</span>
                  </div>
                  <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-white/70">{form.brandTagline}</div>
                </div>
              </GlassPanel>

              <GlassPanel className="animate-fade-up stagger-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white/72">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--text-ghost)]">Marketplace Trust</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">What clients will notice when they compare coaches.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-ghost)]">Gallery Posts</p>
                    <p className="mt-2 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white">{form.gallery.length}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-ghost)]">Achievements</p>
                    <p className="mt-2 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white">{form.achievements.length}</p>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel className="animate-fade-up stagger-5 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--text-ghost)]">Quick Actions</p>
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={copyRoomId}
                    type="button"
                    className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left text-sm text-[var(--text-secondary)] transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
                  >
                    Copy room ID for sharing
                  </button>
                  <a
                    href="/coach"
                    className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left text-sm text-[var(--text-secondary)] transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
                  >
                    Return to coach dashboard
                  </a>
                </div>
              </GlassPanel>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-[var(--border-soft)] bg-[var(--glass-1)] px-8 text-center text-sm text-[var(--text-secondary)]">
            Preparing profile workspace...
          </div>
        )}
      </div>
    </CoachShell>
  );
}
