"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FileBadge2,
  FileHeart,
  Layers3,
  LayoutTemplate,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { CoachShell } from "../../../components/coach-shell";
import { MorphingSquare } from "../../../components/ui/morphing-square";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";

type BuilderKind = "onboarding_form" | "diet_plan" | "training_plan";
type BuilderSection = { id: string; title: string; items: string[] };
type BuilderContent = { coverNote: string; sections: BuilderSection[] };
type BuilderDocument = {
  id: string;
  title: string;
  description: string;
  kind: BuilderKind;
  theme: string;
  status: string;
  clientId: string | null;
  clientName: string | null;
  updatedAt: string;
  content: BuilderContent;
};
type BuilderClient = { id: string; name: string; email: string | null; status: string };
type StudioResponse = { clients: BuilderClient[]; documents: BuilderDocument[] };

const templates = [
  {
    kind: "onboarding_form" as const,
    label: "Onboarding",
    title: "Client Intake System",
    description: "Questionnaires, health intake, goals, and coaching context.",
    icon: ClipboardList,
    accent: "from-cyan-500/30 to-sky-500/10"
  },
  {
    kind: "diet_plan" as const,
    label: "Diet",
    title: "Nutrition Blueprint",
    description: "Meals, rules, supplements, and execution details.",
    icon: FileHeart,
    accent: "from-amber-500/25 to-orange-500/10"
  },
  {
    kind: "training_plan" as const,
    label: "Training",
    title: "Performance Program",
    description: "Sessions, splits, exercises, progressions, and cues.",
    icon: FileBadge2,
    accent: "from-violet-500/25 to-fuchsia-500/10"
  }
];

const blockPresets = [
  { label: "Heading", icon: Type, sectionTitle: "New Heading Block", item: "Write a title here" },
  { label: "Checklist", icon: ClipboardList, sectionTitle: "Checklist", item: "Add checklist point" },
  { label: "Workout", icon: FileBadge2, sectionTitle: "Workout Block", item: "Exercise x sets x reps" },
  { label: "Meal Block", icon: FileHeart, sectionTitle: "Meal Block", item: "Meal / macros / timing" }
] as const;

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultContent(kind: BuilderKind): BuilderContent {
  if (kind === "onboarding_form") {
    return {
      coverNote: "Collect everything you need before the coaching relationship begins.",
      sections: [
        { id: createId("section"), title: "Body & Health", items: ["Age", "Current weight", "Injuries / limitations"] },
        { id: createId("section"), title: "Lifestyle & Goals", items: ["Main goal", "Weekly schedule", "Nutrition struggles"] }
      ]
    };
  }
  if (kind === "diet_plan") {
    return {
      coverNote: "Map the full nutrition path clearly so the client knows exactly what to execute daily.",
      sections: [
        { id: createId("section"), title: "Morning System", items: ["Meal 1: eggs + oats + berries", "Hydration goal before noon", "Supplement stack"] },
        { id: createId("section"), title: "Evening System", items: ["Final meal structure", "Craving control rules", "Sleep preparation nutrition"] }
      ]
    };
  }
  return {
    coverNote: "Build the training structure, intent, and progression your client will follow inside their room.",
    sections: [
      { id: createId("section"), title: "Day 1 - Upper", items: ["Bench Press 4 x 8", "Pull-Ups 4 x 6", "Shoulder Press 3 x 10"] },
      { id: createId("section"), title: "Conditioning", items: ["Bike intervals 8 rounds", "Cooldown walk 10 mins", "Breathing reset 3 mins"] }
    ]
  };
}

function getDefaultDocument(kind: BuilderKind): BuilderDocument {
  const template = templates.find((item) => item.kind === kind)!;
  return {
    id: "",
    title: template.title,
    description: template.description,
    kind,
    theme: kind === "diet_plan" ? "ember" : kind === "onboarding_form" ? "aurora" : "obsidian",
    status: "draft",
    clientId: null,
    clientName: null,
    updatedAt: new Date().toISOString(),
    content: getDefaultContent(kind)
  };
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function kindLabel(kind: BuilderKind) {
  return kind.replace(/_/g, " ");
}

export default function CoachBuilderPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [profile, setProfile] = useState({ name: "Coach", handle: "@coach", role: "Coach", avatar: null as string | null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clients, setClients] = useState<BuilderClient[]>([]);
  const [documents, setDocuments] = useState<BuilderDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<BuilderDocument>(getDefaultDocument("training_plan"));
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(88);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured for the builder studio.");
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!session?.access_token || !user) {
        setError("Coach session missing. Please log in again.");
        setLoading(false);
        return;
      }
      const fallbackName = (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) || user.email?.split("@")[0] || "Coach";
      if (!active) return;
      setProfile({
        name: fallbackName,
        handle: user.email ? `@${user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@coach",
        role: "Coach",
        avatar: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null
      });
      try {
        const response = await fetch("/api/coach/builder", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = (await response.json()) as StudioResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load builder studio.");
        if (!active) return;
        const initialDocument = payload.documents?.[0] || getDefaultDocument("training_plan");
        setClients(payload.clients || []);
        setDocuments(payload.documents || []);
        setActiveDocument(initialDocument);
        setSelectedSectionId(initialDocument.content.sections[0]?.id || null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load builder studio.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  function updateDocument(updater: (current: BuilderDocument) => BuilderDocument) {
    setActiveDocument((current) => updater(current));
  }

  function switchTemplate(kind: BuilderKind) {
    const next = { ...getDefaultDocument(kind), id: "", clientId: activeDocument.clientId, clientName: activeDocument.clientName };
    setActiveDocument(next);
    setSelectedSectionId(next.content.sections[0]?.id || null);
    setSuccess(null);
    setError(null);
  }

  function addSection(sectionTitle = "New Section", item = "New line item") {
    const newSection = { id: createId("section"), title: sectionTitle, items: [item] };
    updateDocument((current) => ({ ...current, content: { ...current.content, sections: [...current.content.sections, newSection] } }));
    setSelectedSectionId(newSection.id);
  }

  function updateSection(sectionId: string, next: Partial<BuilderSection>) {
    updateDocument((current) => ({
      ...current,
      content: { ...current.content, sections: current.content.sections.map((section) => (section.id === sectionId ? { ...section, ...next } : section)) }
    }));
  }

  function addItem(sectionId: string) {
    updateDocument((current) => ({
      ...current,
      content: { ...current.content, sections: current.content.sections.map((section) => (section.id === sectionId ? { ...section, items: [...section.items, "New line item"] } : section)) }
    }));
  }

  function updateItem(sectionId: string, itemIndex: number, value: string) {
    updateDocument((current) => ({
      ...current,
      content: {
        ...current.content,
        sections: current.content.sections.map((section) =>
          section.id === sectionId ? { ...section, items: section.items.map((item, index) => (index === itemIndex ? value : item)) } : section
        )
      }
    }));
  }

  function removeSection(sectionId: string) {
    const remaining = activeDocument.content.sections.filter((section) => section.id !== sectionId);
    updateDocument((current) => ({ ...current, content: { ...current.content, sections: remaining } }));
    setSelectedSectionId(remaining[0]?.id || null);
  }

  async function saveDocument() {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");
      const response = await fetch("/api/coach/builder", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify(activeDocument)
      });
      const payload = (await response.json()) as { error?: string; document?: BuilderDocument };
      if (!response.ok || !payload.document) throw new Error(payload.error || "Unable to save document.");
      setActiveDocument(payload.document);
      setDocuments((current) => [payload.document!, ...current.filter((item) => item.id !== payload.document!.id)]);
      setSuccess("Draft saved to your builder studio.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save document.");
    } finally {
      setSaving(false);
    }
  }

  async function sendDocument() {
    if (!supabase) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      let documentId = activeDocument.id;
      if (!documentId) {
        await saveDocument();
        documentId = activeDocument.id;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");
      if (!documentId) throw new Error("Save the document before sending.");
      if (!activeDocument.clientId) throw new Error("Assign a client before sending.");
      const response = await fetch("/api/coach/builder/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({ documentId })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to send document.");
      setActiveDocument((current) => ({ ...current, status: "sent" }));
      setDocuments((current) => current.map((item) => (item.id === documentId ? { ...item, status: "sent" } : item)));
      setSuccess("Document sent into the client relationship.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send document.");
    } finally {
      setSending(false);
    }
  }

  const assignedClient = clients.find((client) => client.id === activeDocument.clientId) || null;
  const selectedSection =
    activeDocument.content.sections.find((section) => section.id === selectedSectionId) || activeDocument.content.sections[0] || null;

  return (
    <CoachShell profile={profile}>
      {loading ? (
        <div className="flex min-h-[620px] items-center justify-center">
          <MorphingSquare message="Loading builder studio..." />
        </div>
      ) : (
        <div className="portal-page flex min-h-[760px] flex-col gap-4">
          {error ? <div className="rounded-[18px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
          {success ? <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

          <section className="flex min-h-[780px] min-w-0 overflow-hidden rounded-[28px] border border-white/[0.06] bg-[rgba(10,10,16,0.78)] shadow-[var(--shadow-panel)] backdrop-blur-xl">
            <aside className="hidden w-[64px] shrink-0 border-r border-white/[0.06] bg-[rgba(12,12,18,0.78)] xl:flex xl:flex-col xl:items-center xl:gap-3 xl:px-2 xl:py-4">
              {[LayoutTemplate, Sparkles, Layers3].map((Icon, index) => (
                <button
                  key={index}
                  type="button"
                  className={`flex h-10 w-10 items-center justify-center rounded-[14px] border transition ${
                    index === 0
                      ? "border-[rgba(0,163,255,0.26)] bg-[rgba(0,163,255,0.08)] text-white shadow-[var(--shadow-glow)]"
                      : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/[0.14] hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </aside>

            <aside className="w-[286px] shrink-0 border-r border-white/[0.06] bg-[rgba(12,12,20,0.82)]">
              <div className="border-b border-white/[0.06] px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-ghost)]">Designer</p>
                    <h1 className="mt-1 font-display text-[2rem] font-bold tracking-[-0.05em] text-white">Builder Studio</h1>
                  </div>
                  <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white transition hover:border-white/[0.14] hover:bg-white/[0.08]">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Design everything inside HEIMDALLFIT.
                </div>
              </div>

              <div className="max-h-[calc(100vh-290px)] overflow-y-auto px-4 py-5">
                <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    Templates
                  </div>
                  <div className="mt-3 space-y-2">
                    {templates.map((template) => {
                      const Icon = template.icon;
                      const active = activeDocument.kind === template.kind;
                      return (
                        <button
                          key={template.kind}
                          type="button"
                          onClick={() => switchTemplate(template.kind)}
                          className={`relative w-full overflow-hidden rounded-[18px] border bg-gradient-to-br p-4 text-left transition hover:-translate-y-px ${
                            active ? `border-[rgba(0,163,255,0.28)] ${template.accent} shadow-[var(--shadow-glow)]` : "border-white/[0.07] from-[rgba(255,255,255,0.03)] to-[rgba(255,255,255,0.015)] hover:border-white/[0.14]"
                          }`}
                        >
                          <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${template.accent}`} />
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.04] text-white">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-white">{template.label}</p>
                              <p className="mt-1 text-[11px] leading-5 text-white/55">{template.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Blocks
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {blockPresets.map((block) => {
                      const Icon = block.icon;
                      return (
                        <button
                          key={block.label}
                          type="button"
                          onClick={() => addSection(block.sectionTitle, block.item)}
                          className="rounded-[16px] border border-white/[0.07] bg-[rgba(255,255,255,0.025)] p-3 text-left transition hover:-translate-y-px hover:border-[rgba(0,163,255,0.22)] hover:bg-[rgba(0,163,255,0.08)]"
                        >
                          <Icon className="h-4 w-4 text-white/72" />
                          <p className="mt-2 text-[12px] font-medium text-white">{block.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">
                    <span>Pages & Drafts</span>
                    <Layers3 className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <button type="button" className="w-full rounded-[18px] border border-[rgba(0,163,255,0.26)] bg-[rgba(0,163,255,0.10)] p-3 text-left shadow-[var(--shadow-glow)]">
                      <p className="text-[13px] font-semibold text-white">Page 1</p>
                      <p className="mt-1 text-[11px] text-white/55">{activeDocument.title}</p>
                    </button>
                    {documents.map((document) => (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => {
                          setActiveDocument(document);
                          setSelectedSectionId(document.content.sections[0]?.id || null);
                        }}
                        className={`w-full rounded-[16px] border px-3 py-3 text-left transition ${
                          activeDocument.id === document.id ? "border-white/18 bg-white/[0.06]" : "border-white/[0.07] bg-[rgba(255,255,255,0.02)] hover:border-white/[0.12]"
                        }`}
                      >
                        <p className="truncate text-[13px] font-medium text-white">{document.title}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
                          <span className="uppercase tracking-[0.18em]">{kindLabel(document.kind)}</span>
                          <span>{formatUpdatedAt(document.updatedAt)}</span>
                        </div>
                      </button>
                    ))}
                    {!documents.length ? (
                      <div className="rounded-[16px] border border-dashed border-white/[0.09] bg-[rgba(255,255,255,0.02)] px-3 py-4 text-sm text-white/42">
                        Start from a template and your saved drafts will appear here.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[rgba(12,12,18,0.82)] px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white/78">{activeDocument.title}</div>
                  <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">
                    {kindLabel(activeDocument.kind)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((current) => Math.max(70, current - 5))}
                    className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-white/68 transition hover:border-white/[0.14] hover:bg-white/[0.08]"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/72">{zoom}%</div>
                  <button
                    type="button"
                    onClick={() => setZoom((current) => Math.min(110, current + 5))}
                    className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-white/68 transition hover:border-white/[0.14] hover:bg-white/[0.08]"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={saveDocument}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white transition hover:border-white/[0.14] hover:bg-white/[0.08] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={sendDocument}
                    disabled={sending}
                    className="inline-flex items-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,var(--accent),rgba(0,120,220,1))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,163,255,0.28)] transition hover:-translate-y-px hover:shadow-[0_14px_34px_rgba(0,163,255,0.36)] disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </header>

              <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_292px]">
                <div className="min-h-0 bg-[radial-gradient(circle_at_top,rgba(0,163,255,0.10),transparent_28%),#dfe4ee] p-6">
                  <div className="flex h-full min-h-0 flex-col rounded-[30px] border border-[#d8dbe5] bg-[#eef2f8] shadow-[0_32px_100px_rgba(15,23,42,0.16)]">
                    <div className="flex items-center justify-between border-b border-[#dde1ea] px-6 py-4">
                      <div className="flex items-center gap-3 text-sm text-[#596176]">
                        <span>Page 1</span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#677086] shadow-sm">A4 landscape</span>
                      </div>
                      <div className="rounded-full border border-[#d6dae5] bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-[#75809b]">
                        live canvas
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto px-6 py-8">
                      <div
                        className="w-[1440px] max-w-full rounded-[28px] bg-white p-10 shadow-[0_25px_80px_rgba(15,23,42,0.14)]"
                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                      >
                        <div className="border-b border-[#e9eaf0] pb-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.32em] text-[#8f98ae]">{kindLabel(activeDocument.kind)}</p>
                              <h2 className="mt-3 text-[2.2rem] font-semibold tracking-[-0.05em] text-[#0f172a]">{activeDocument.title}</h2>
                            </div>
                            <div className="rounded-full bg-[#f3f5fb] px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#6b7388]">
                              {assignedClient?.name || "Unassigned"}
                            </div>
                          </div>
                          <textarea
                            value={activeDocument.content.coverNote}
                            onChange={(event) =>
                              updateDocument((current) => ({
                                ...current,
                                content: { ...current.content, coverNote: event.target.value }
                              }))
                            }
                            className="mt-4 min-h-[88px] w-full resize-none rounded-[18px] border border-[#e3e5ec] bg-[#fbfcff] px-4 py-3 text-[15px] leading-7 text-[#334155] outline-none"
                          />
                        </div>

                        <div className="mt-8 grid gap-5 xl:grid-cols-2">
                          {activeDocument.content.sections.map((section) => (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => setSelectedSectionId(section.id)}
                              className={`rounded-[24px] border p-6 text-left transition ${
                                selectedSection?.id === section.id
                                  ? "border-[#6f67ff] bg-[#f7f5ff] shadow-[0_10px_30px_rgba(111,103,255,0.12)]"
                                  : "border-[#e4e7ef] bg-[#fcfcfe] hover:border-[#cfd5e3]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <input
                                  value={section.title}
                                  onChange={(event) => updateSection(section.id, { title: event.target.value })}
                                  className="w-full bg-transparent text-[1.15rem] font-semibold text-[#0f172a] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeSection(section.id);
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f4f8] text-[#7c8597]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="mt-4 space-y-2">
                                {section.items.map((item, index) => (
                                  <div key={`${section.id}-${index}`} className="flex items-start gap-3 rounded-[14px] bg-[#f5f7fb] px-3 py-3">
                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6f67ff]" />
                                    <input
                                      value={item}
                                      onChange={(event) => updateItem(section.id, index, event.target.value)}
                                      className="w-full bg-transparent text-[14px] leading-6 text-[#334155] outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addItem(section.id);
                                }}
                                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#dde2ec] bg-white px-3 py-2 text-xs font-medium text-[#4b5565]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add line item
                              </button>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#dde1ea] px-5 py-3">
                      <div className="flex items-center gap-3 overflow-x-auto">
                        <button className="flex min-w-[148px] items-center gap-3 rounded-[20px] border border-[#cfd5e3] bg-white px-3 py-3 text-left shadow-sm">
                          <div className="h-12 w-10 rounded-[10px] border border-[#d7dce8] bg-[#f7f8fb]" />
                          <div>
                            <p className="text-sm font-medium text-[#0f172a]">Page 1</p>
                            <p className="text-xs text-[#728099]">{activeDocument.title}</p>
                          </div>
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-[20px] border border-dashed border-[#c7cedd] bg-white px-4 py-4 text-sm font-medium text-[#334155]">
                          <Plus className="h-4 w-4" />
                          Add page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="border-l border-white/[0.06] bg-[rgba(12,12,20,0.82)] p-5">
                  <div className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Inspector
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Edit the selected block and prepare the asset for delivery.</p>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">Document Settings</p>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-white/34">Description</span>
                      <textarea
                        value={activeDocument.description}
                        onChange={(event) => updateDocument((current) => ({ ...current, description: event.target.value }))}
                        className="min-h-[92px] w-full rounded-[16px] border border-white/[0.08] bg-[#101117] px-4 py-3 text-sm text-white outline-none"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-white/34">Assigned Client</span>
                      <select
                        value={activeDocument.clientId || ""}
                        onChange={(event) =>
                          updateDocument((current) => ({
                            ...current,
                            clientId: event.target.value || null,
                            clientName: clients.find((client) => client.id === event.target.value)?.name || null
                          }))
                        }
                        className="h-11 w-full rounded-[16px] border border-white/[0.08] bg-[#101117] px-4 text-sm text-white outline-none"
                      >
                        <option value="">No client selected</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-ghost)]">Selected Block</p>
                    {selectedSection ? (
                      <div className="mt-4 space-y-4">
                        <label className="block">
                          <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-white/34">Block Title</span>
                          <input
                            value={selectedSection.title}
                            onChange={(event) => updateSection(selectedSection.id, { title: event.target.value })}
                            className="h-11 w-full rounded-[16px] border border-white/[0.08] bg-[#101117] px-4 text-sm text-white outline-none"
                          />
                        </label>
                        <div className="rounded-[16px] bg-[#101117] px-4 py-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/34">Items</p>
                          <p className="mt-2 text-sm text-white/72">{selectedSection.items.length} content line{selectedSection.items.length === 1 ? "" : "s"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addItem(selectedSection.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#2b2c35] bg-[#101117] px-4 py-2.5 text-sm text-white"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[16px] border border-dashed border-[#2a2b34] bg-[#101117] px-4 py-5 text-sm text-white/42">
                        Select a block on the canvas to edit it here.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-[20px] border border-[#262730] bg-[#181922] p-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/36">Dispatch</p>
                    <div className="mt-4 space-y-3 text-sm text-white/68">
                      <div className="rounded-[16px] bg-[#101117] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">Assigned Client</p>
                        <p className="mt-2 font-medium text-white">{assignedClient?.name || "No client selected yet"}</p>
                      </div>
                      <div className="rounded-[16px] bg-[#101117] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">Current Status</p>
                        <p className="mt-2 font-medium capitalize text-white">{activeDocument.status}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={sendDocument}
                      disabled={sending}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[16px] bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {sending ? "Sending..." : "Send Current Asset"}
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      )}
    </CoachShell>
  );
}
