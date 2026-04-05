"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  FileBadge2,
  FileHeart,
  GripVertical,
  ImagePlus,
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
type BuilderSection = {
  id: string;
  title: string;
  items: string[];
  type?: "text" | "image";
  imageUrl?: string | null;
  imagePath?: string | null;
  imageCaption?: string;
  span?: 1 | 2;
  height?: "sm" | "md" | "lg";
};
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
  { label: "Meal Block", icon: FileHeart, sectionTitle: "Meal Block", item: "Meal / macros / timing" },
  { label: "Image", icon: ImagePlus, sectionTitle: "Image Block", item: "" }
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
  const [leftPanel, setLeftPanel] = useState<"templates" | "blocks" | "drafts" | null>("templates");
  const [zoom, setZoom] = useState(88);
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  function addImageSection() {
    const newSection: BuilderSection = {
      id: createId("section"),
      title: "Image Block",
      items: [],
      type: "image",
      imageUrl: null,
      imagePath: null,
      imageCaption: "Add a caption or coaching note for this visual.",
      span: 2,
      height: "md"
    };
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

  function moveSection(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    updateDocument((current) => {
      const sections = [...current.content.sections];
      const sourceIndex = sections.findIndex((section) => section.id === sourceId);
      const targetIndex = sections.findIndex((section) => section.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const [moved] = sections.splice(sourceIndex, 1);
      sections.splice(targetIndex, 0, moved);
      return { ...current, content: { ...current.content, sections } };
    });
  }

  async function uploadImageToSection(sectionId: string, file: File) {
    if (!supabase) return;
    setUploadingSectionId(sectionId);
    setError(null);
    setSuccess(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Coach session missing. Please log in again.");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/coach/builder/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      });

      const payload = (await response.json()) as { error?: string; path?: string; url?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to upload image.");

      updateSection(sectionId, {
        type: "image",
        imageUrl: payload.url,
        imagePath: payload.path || null,
        span: 2
      });
      setSuccess("Image added to the canvas.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.");
    } finally {
      setUploadingSectionId(null);
    }
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
  const isSelectedImageBlock = selectedSection?.type === "image";

  return (
    <CoachShell profile={profile}>
      {loading ? (
        <div style={{ display: "flex", minHeight: "620px", alignItems: "center", justifyContent: "center" }}>
          <MorphingSquare message="Loading builder studio..." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
          {error ? <div style={{ marginBottom: "14px", borderRadius: "18px", border: "1px solid rgba(239,68,68,0.28)", background: "rgba(127,29,29,0.24)", padding: "14px 18px", color: "rgb(254 205 211)", fontSize: "14px" }}>{error}</div> : null}
          {success ? <div style={{ marginBottom: "14px", borderRadius: "18px", border: "1px solid rgba(52,211,153,0.24)", background: "rgba(6,78,59,0.22)", padding: "14px 18px", color: "rgb(167 243 208)", fontSize: "14px" }}>{success}</div> : null}

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "#0A0A0F" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file && selectedSectionId) {
                  await uploadImageToSection(selectedSectionId, file);
                }
                event.target.value = "";
              }}
            />
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,10,16,0.95)", padding: "0 16px", gap: "12px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                <input value={activeDocument.title} onChange={(e) => updateDocument((cur) => ({ ...cur, title: e.target.value }))} style={{ background: "transparent", border: "none", outline: "none", fontSize: "14px", fontWeight: "600", fontFamily: "'Syne', sans-serif", color: "rgba(255,255,255,0.90)", maxWidth: "240px", minWidth: "80px" }} />
                <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", background: "rgba(0,163,255,0.10)", border: "1px solid rgba(0,163,255,0.20)", color: "#00A3FF", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
                  {activeDocument.kind.replace(/_/g, " ")}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button type="button" onClick={() => setZoom((z) => Math.max(50, z - 10))} style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ZoomOut style={{ width: 13, height: 13 }} /></button>
                <span style={{ width: "46px", textAlign: "center", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.65)" }}>{zoom}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(150, z + 10))} style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ZoomIn style={{ width: 13, height: 13 }} /></button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button type="button" onClick={saveDocument} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.80)", fontSize: "12px", fontWeight: "500", cursor: "pointer", opacity: saving ? 0.6 : 1 }}><Save style={{ width: 13, height: 13 }} />{saving ? "Saving..." : "Save"}</button>
                <button type="button" onClick={sendDocument} disabled={sending} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "10px", background: "linear-gradient(135deg, #00A3FF, #0070CC)", border: "none", color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer", boxShadow: "0 3px 14px rgba(0,163,255,0.40)", opacity: sending ? 0.6 : 1 }}><Send style={{ width: 13, height: 13 }} />{sending ? "Sending..." : "Send to Client"}</button>
              </div>
            </header>

            <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
              <div style={{ width: "60px", flexShrink: 0, background: "rgba(10,10,16,0.90)", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "12px", gap: "6px" }}>
                {[{ key: "templates", Icon: LayoutTemplate, label: "Templates" }, { key: "blocks", Icon: Sparkles, label: "Blocks" }, { key: "drafts", Icon: Layers3, label: "Drafts" }].map(({ key, Icon, label }) => (
                  <button key={key} type="button" title={label} onClick={() => setLeftPanel((prev) => (prev === key ? null : (key as "templates" | "blocks" | "drafts")))} style={{ width: "40px", height: "40px", borderRadius: "12px", background: leftPanel === key ? "rgba(0,163,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${leftPanel === key ? "rgba(0,163,255,0.30)" : "rgba(255,255,255,0.07)"}`, color: leftPanel === key ? "#00A3FF" : "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Icon style={{ width: 16, height: 16 }} />
                  </button>
                ))}
                <div style={{ width: "28px", height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                <button type="button" title="Add Section" onClick={() => addSection()} style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(67,208,127,0.10)", border: "1px solid rgba(67,208,127,0.22)", color: "#43D07F", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Plus style={{ width: 16, height: 16 }} /></button>
              </div>
              {leftPanel ? (
                <div style={{ width: "240px", flexShrink: 0, background: "rgba(11,11,18,0.97)", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", overflowY: "auto", padding: "16px 12px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: "10px", fontFamily: "'DM Mono', monospace" }}>{leftPanel === "templates" ? "Templates" : leftPanel === "blocks" ? "Add Block" : "Saved Drafts"}</p>

                  {leftPanel === "templates" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {templates.map((template) => {
                        const Icon = template.icon;
                        const isActive = activeDocument.kind === template.kind;
                        return (
                          <button key={template.kind} type="button" onClick={() => switchTemplate(template.kind)} style={{ textAlign: "left", borderRadius: "14px", background: isActive ? "rgba(0,163,255,0.10)" : "rgba(255,255,255,0.03)", border: `1px solid ${isActive ? "rgba(0,163,255,0.25)" : "rgba(255,255,255,0.07)"}`, padding: "12px", cursor: "pointer", position: "relative" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                              <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon style={{ width: 14, height: 14, color: isActive ? "#00A3FF" : "rgba(255,255,255,0.7)" }} /></div>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.88)" }}>{template.label}</span>
                            </div>
                            <p style={{ fontSize: "11px", lineHeight: "1.5", color: "rgba(255,255,255,0.45)", margin: 0 }}>{template.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {leftPanel === "blocks" ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {blockPresets.map((block) => {
                          const Icon = block.icon;
                          return (
                            <button key={block.label} type="button" onClick={() => (block.label === "Image" ? addImageSection() : addSection(block.sectionTitle, block.item))} style={{ borderRadius: "12px", padding: "12px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: "8px" }}>
                              <Icon style={{ width: 15, height: 15, color: "rgba(255,255,255,0.60)" }} />
                              <span style={{ fontSize: "11px", fontWeight: "500", color: "rgba(255,255,255,0.80)" }}>{block.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => addSection()} style={{ marginTop: "12px", width: "100%", padding: "10px", borderRadius: "12px", background: "rgba(67,208,127,0.08)", border: "1px solid rgba(67,208,127,0.20)", color: "#43D07F", fontSize: "12px", fontWeight: "500", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}><Plus style={{ width: 13, height: 13 }} />New blank section</button>
                    </>
                  ) : null}

                  {leftPanel === "drafts" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {documents.length === 0 ? <div style={{ padding: "16px", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.10)", fontSize: "12px", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>No saved drafts yet</div> : null}
                      {documents.map((doc) => (
                        <button key={doc.id} type="button" onClick={() => { setActiveDocument(doc); setSelectedSectionId(doc.content.sections[0]?.id || null); }} style={{ textAlign: "left", borderRadius: "12px", padding: "10px 12px", background: activeDocument.id === doc.id ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${activeDocument.id === doc.id ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer" }}>
                          <p style={{ fontSize: "12px", fontWeight: "500", color: "rgba(255,255,255,0.85)", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.38)", fontFamily: "'DM Mono', monospace" }}><span>{kindLabel(doc.kind)}</span><span>{formatUpdatedAt(doc.updatedAt)}</span></div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ flex: 1, minWidth: 0, background: "#ECEEF4", overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 40px", gap: "24px" }}>
                <div style={{ width: "100%", maxWidth: "980px", minWidth: "620px", background: "#fff", borderRadius: "16px", boxShadow: "0 8px 40px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)", overflow: "hidden", transform: `scale(${zoom / 100})`, transformOrigin: "top center", marginBottom: zoom < 100 ? `${(zoom - 100) * 6}px` : "0" }}>
                  <div style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #141419 100%)", padding: "28px 32px 24px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: activeDocument.kind === "onboarding_form" ? "radial-gradient(circle, rgba(0,163,255,0.15) 0%, transparent 70%)" : activeDocument.kind === "diet_plan" ? "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)" : "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", position: "relative" }}>
                      <div>
                        <p style={{ fontSize: "9px", letterSpacing: "0.34em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", marginBottom: "10px", fontFamily: "'DM Mono', monospace" }}>{kindLabel(activeDocument.kind)} · HEIMDALLFIT</p>
                        <h1 style={{ fontSize: "2rem", fontWeight: "700", letterSpacing: "-0.04em", color: "#fff", margin: 0, fontFamily: "'Syne', sans-serif" }}>{activeDocument.title}</h1>
                      </div>
                      <div style={{ padding: "6px 14px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", fontSize: "11px", color: "rgba(255,255,255,0.65)", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" }}>{assignedClient?.name || "Unassigned"}</div>
                    </div>
                    <textarea value={activeDocument.content.coverNote} onChange={(e) => updateDocument((cur) => ({ ...cur, content: { ...cur.content, coverNote: e.target.value } }))} placeholder="Add a cover note..." style={{ marginTop: "16px", width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", lineHeight: "1.7", color: "rgba(255,255,255,0.75)", resize: "none", outline: "none", minHeight: "72px", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ padding: "28px 32px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px", background: "#f7f8fb", minHeight: "320px" }}>
                    {activeDocument.content.sections.map((section, sIdx) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={() => setDraggingSectionId(section.id)}
                        onDragEnd={() => setDraggingSectionId(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingSectionId) moveSection(draggingSectionId, section.id);
                          setDraggingSectionId(null);
                        }}
                        onClick={() => setSelectedSectionId(section.id)}
                        style={{
                          gridColumn: section.span === 2 ? "span 2" : "span 1",
                          minHeight: section.type === "image" ? (section.height === "sm" ? "220px" : section.height === "lg" ? "420px" : "320px") : "unset",
                          borderRadius: "16px",
                          background: "#fff",
                          border: `2px solid ${selectedSection?.id === section.id ? "#6F67FF" : draggingSectionId === section.id ? "#94A3FF" : "#E4E7EF"}`,
                          boxShadow: selectedSection?.id === section.id ? "0 8px 24px rgba(111,103,255,0.14)" : "0 2px 8px rgba(15,23,42,0.06)",
                          cursor: "grab",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          animation: `fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) ${sIdx * 0.05}s both`
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 10px", borderBottom: "1px solid #F0F2F7", background: selectedSection?.id === section.id ? "#FAFAFE" : "#FAFCFF" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                            <GripVertical style={{ width: 14, height: 14, color: "#A0A8BA", flexShrink: 0 }} />
                            <input value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} onClick={(e) => e.stopPropagation()} style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", fontWeight: "700", color: "#0F172A", fontFamily: "'Syne', sans-serif", flex: 1, minWidth: 0 }} />
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} style={{ width: "26px", height: "26px", borderRadius: "8px", background: "transparent", border: "none", color: "#B0B8CC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 style={{ width: 13, height: 13 }} /></button>
                        </div>

                        {section.type === "image" ? (
                          <div style={{ padding: "14px", display: "flex", flex: 1, flexDirection: "column", gap: "10px" }}>
                            <div style={{ position: "relative", flex: 1, minHeight: section.height === "sm" ? "130px" : section.height === "lg" ? "310px" : "210px", borderRadius: "14px", border: "1px dashed #D8DEEA", background: section.imageUrl ? `url(${section.imageUrl}) center/cover no-repeat` : "linear-gradient(135deg, #eef2ff, #f8fafc)" }}>
                              {!section.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionId(section.id);
                                    fileInputRef.current?.click();
                                  }}
                                  style={{ position: "absolute", inset: 0, border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: "#64748B", cursor: "pointer" }}
                                >
                                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#FFFFFFCC", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}>
                                    <ImagePlus style={{ width: 18, height: 18 }} />
                                  </div>
                                  <span style={{ fontSize: "12px", fontWeight: "600" }}>{uploadingSectionId === section.id ? "Uploading..." : "Add photo"}</span>
                                </button>
                              ) : null}
                            </div>
                            <input
                              value={section.imageCaption || ""}
                              onChange={(e) => updateSection(section.id, { imageCaption: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Image caption / coaching note"
                              style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", outline: "none", borderRadius: "10px", padding: "10px 12px", fontSize: "12px", color: "#334155" }}
                            />
                          </div>
                        ) : (
                          <>
                            <div style={{ padding: "10px 14px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                              {section.items.map((item, idx) => (
                                <div key={`${section.id}-${idx}`} style={{ display: "flex", alignItems: "flex-start", gap: "8px", borderRadius: "9px", background: "#F5F7FB", padding: "7px 10px" }} onClick={(e) => e.stopPropagation()}>
                                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: selectedSection?.id === section.id ? "#6F67FF" : "#C5CADC", marginTop: "7px", flexShrink: 0 }} />
                                  <input value={item} onChange={(e) => updateItem(section.id, idx, e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", lineHeight: "1.6", color: "#334155", fontFamily: "'DM Sans', sans-serif", flex: 1, minWidth: 0 }} />
                                </div>
                              ))}
                            </div>
                            <div style={{ padding: "8px 14px 12px" }}>
                              <button type="button" onClick={(e) => { e.stopPropagation(); addItem(section.id); }} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "20px", background: "transparent", border: "1px solid #DDE2EC", fontSize: "11px", color: "#4B5565", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}><Plus style={{ width: 11, height: 11 }} />Add line</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    <button type="button" onClick={() => addSection()} style={{ borderRadius: "16px", background: "transparent", border: "2px dashed #CBD2E0", minHeight: "140px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", color: "#8A94AA", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#EDF0F7", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus style={{ width: 16, height: 16, color: "#8A94AA" }} /></div>
                      Add Section
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ width: "264px", flexShrink: 0, background: "rgba(10,10,16,0.95)", borderLeft: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <section>
                  <p style={{ fontSize: "9px", letterSpacing: "0.30em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "10px", fontFamily: "'DM Mono', monospace" }}>Document</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ display: "block" }}>
                      <span style={{ display: "block", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: "6px", fontFamily: "'DM Mono', monospace" }}>Assign Client</span>
                      <select value={activeDocument.clientId || ""} onChange={(e) => updateDocument((cur) => ({ ...cur, clientId: e.target.value || null, clientName: clients.find((c) => c.id === e.target.value)?.name || null }))} style={{ width: "100%", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.80)", fontSize: "12px", paddingLeft: "10px", outline: "none" }}>
                        <option value="">No client selected</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "block" }}>
                      <span style={{ display: "block", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: "6px", fontFamily: "'DM Mono', monospace" }}>Description</span>
                      <textarea value={activeDocument.description} onChange={(e) => updateDocument((cur) => ({ ...cur, description: e.target.value }))} style={{ width: "100%", borderRadius: "10px", padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.72)", fontSize: "12px", resize: "none", outline: "none", minHeight: "64px", boxSizing: "border-box" }} />
                    </label>
                  </div>
                </section>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

                <section>
                  <p style={{ fontSize: "9px", letterSpacing: "0.30em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "10px", fontFamily: "'DM Mono', monospace" }}>Selected Block</p>
                  {selectedSection ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ display: "block" }}>
                        <span style={{ display: "block", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: "6px", fontFamily: "'DM Mono', monospace" }}>Block Title</span>
                        <input value={selectedSection.title} onChange={(e) => updateSection(selectedSection.id, { title: e.target.value })} style={{ width: "100%", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.88)", fontSize: "12px", paddingLeft: "10px", outline: "none", boxSizing: "border-box" }} />
                      </label>
                      <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{isSelectedImageBlock ? "Block Type" : "Lines"}</span>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.85)", fontFamily: "'DM Mono', monospace" }}>{isSelectedImageBlock ? "IMAGE" : selectedSection.items.length}</span>
                      </div>
                      {isSelectedImageBlock ? (
                        <>
                          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: "100%", padding: "9px", borderRadius: "10px", background: "rgba(0,163,255,0.09)", border: "1px solid rgba(0,163,255,0.18)", color: "#8DD3FF", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}><ImagePlus style={{ width: 12, height: 12 }} />{uploadingSectionId === selectedSection.id ? "Uploading..." : "Replace Image"}</button>
                          <label style={{ display: "block" }}>
                            <span style={{ display: "block", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: "6px", fontFamily: "'DM Mono', monospace" }}>Caption</span>
                            <textarea value={selectedSection.imageCaption || ""} onChange={(e) => updateSection(selectedSection.id, { imageCaption: e.target.value })} style={{ width: "100%", minHeight: "78px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.88)", fontSize: "12px", padding: "10px", outline: "none", boxSizing: "border-box", resize: "none" }} />
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <button type="button" onClick={() => updateSection(selectedSection.id, { span: selectedSection.span === 2 ? 1 : 2 })} style={{ padding: "9px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.72)", fontSize: "12px", cursor: "pointer" }}>{selectedSection.span === 2 ? "Single Width" : "Double Width"}</button>
                            <select value={selectedSection.height || "md"} onChange={(e) => updateSection(selectedSection.id, { height: e.target.value as "sm" | "md" | "lg" })} style={{ height: "38px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.72)", fontSize: "12px", paddingLeft: "10px", outline: "none" }}>
                              <option value="sm">Short</option>
                              <option value="md">Medium</option>
                              <option value="lg">Tall</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <button type="button" onClick={() => addItem(selectedSection.id)} style={{ width: "100%", padding: "9px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.72)", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}><Plus style={{ width: 12, height: 12 }} />Add Item</button>
                      )}
                      <button type="button" onClick={() => removeSection(selectedSection.id)} style={{ width: "100%", padding: "9px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,68,68,0.85)", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}><Trash2 style={{ width: 12, height: 12 }} />Remove Block</button>
                    </div>
                  ) : (
                    <div style={{ padding: "20px 12px", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.10)", fontSize: "11px", color: "rgba(255,255,255,0.30)", textAlign: "center", lineHeight: "1.6" }}>Click any block on the canvas to inspect and edit it here.</div>
                  )}
                </section>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

                <section>
                  <p style={{ fontSize: "9px", letterSpacing: "0.30em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "10px", fontFamily: "'DM Mono', monospace" }}>Dispatch</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[{ label: "Assigned To", value: assignedClient?.name || "No client yet" }, { label: "Status", value: activeDocument.status }].map((row) => (
                      <div key={row.label} style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'DM Mono', monospace" }}>{row.label}</span>
                        <span style={{ fontSize: "12px", fontWeight: "500", color: "rgba(255,255,255,0.80)", textTransform: "capitalize" }}>{row.value}</span>
                      </div>
                    ))}
                    <button type="button" onClick={sendDocument} disabled={sending} style={{ width: "100%", padding: "11px", borderRadius: "12px", background: "linear-gradient(135deg, #00A3FF, #0070CC)", border: "none", color: "#fff", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", cursor: "pointer", boxShadow: "0 4px 18px rgba(0,163,255,0.38)", opacity: sending ? 0.6 : 1, marginTop: "4px" }}><Send style={{ width: 13, height: 13 }} />{sending ? "Sending..." : "Send to Client"}</button>
                  </div>
                </section>
              </div>
            </div>

            <div style={{ height: "68px", flexShrink: 0, background: "rgba(10,10,16,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 16px", gap: "10px", overflowX: "auto" }}>
              <button type="button" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px 6px 8px", borderRadius: "12px", background: "rgba(111,103,255,0.12)", border: "1px solid rgba(111,103,255,0.30)", cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: "32px", height: "24px", borderRadius: "5px", background: "linear-gradient(135deg, #0A0A0F, #1A1A2A)", border: "1px solid rgba(255,255,255,0.12)" }} />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "11px", fontWeight: "600", color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.2 }}>Page 1</p>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>{activeDocument.title}</p>
                </div>
              </button>
              <button type="button" style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 14px", borderRadius: "12px", background: "transparent", border: "1px dashed rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.45)", fontSize: "12px", cursor: "pointer", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}><Plus style={{ width: 13, height: 13 }} />Add page</button>
            </div>
          </div>
        </div>
      )}
    </CoachShell>
  );
}
