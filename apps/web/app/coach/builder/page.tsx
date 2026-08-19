"use client";

import {
  AlignHorizontalSpaceAround, Bot, CheckSquare, ChevronDown, Circle, FileHeart, ImagePlus, Layers3, ListChecks,
  PanelRight, Plus, Redo2, Save, Send, Sparkles, Table2, Type, Undo2, ZoomIn, ZoomOut
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuilderCanvas } from "../../../components/builder/builder-canvas";
import { BuilderCopilot, type CopilotMessage } from "../../../components/builder/builder-copilot";
import { BuilderProperties } from "../../../components/builder/builder-properties";
import { CoachShell } from "../../../components/coach-shell";
import {
  ARTBOARD_HEIGHT, ARTBOARD_WIDTH, DEFAULT_LAYER_STYLE, type BuilderDocument, type BuilderKind, type BuilderLayer,
  type BuilderLayerType, type BuilderPage, type BuilderStudioResponse
} from "../../../lib/builder-types";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../../lib/supabase";

const templates: Array<{ kind: BuilderKind; label: string; description: string; icon: typeof FileHeart }> = [
  { kind: "training_plan", label: "Training", description: "Programs, sessions, progression", icon: ListChecks },
  { kind: "diet_plan", label: "Nutrition", description: "Meals, macros, daily systems", icon: FileHeart },
  { kind: "onboarding_form", label: "Onboarding", description: "Intake, goals, lifestyle", icon: CheckSquare }
];

const elementButtons: Array<{ type: BuilderLayerType; label: string; icon: typeof Type }> = [
  { type: "text", label: "Text", icon: Type }, { type: "checklist", label: "List", icon: ListChecks },
  { type: "table", label: "Table", icon: Table2 }, { type: "image", label: "Image", icon: ImagePlus },
  { type: "shape", label: "Shape", icon: Circle }
];

function id(prefix: string) { return `${prefix}-${crypto.randomUUID().slice(0, 8)}`; }

function newLayer(type: BuilderLayerType, index: number): BuilderLayer {
  const base: BuilderLayer = {
    id: id("layer"), type, name: type === "text" ? "Text" : type === "checklist" ? "Checklist" : type === "table" ? "Table" : type === "image" ? "Image" : "Shape",
    x: 70 + (index % 4) * 24, y: 100 + (index % 6) * 28, width: 360, height: 120, rotation: 0, opacity: 1, locked: false, hidden: false,
    text: "", items: [], rows: [], imageUrl: null, imagePath: null, style: { ...DEFAULT_LAYER_STYLE }
  };
  if (type === "text") return { ...base, text: "Double-click to edit this text", height: 80, style: { ...base.style, fontFamily: "Clash Display", fontSize: 34, fontWeight: 650, padding: 4, color: "#111827" } };
  if (type === "checklist") return { ...base, items: ["First point", "Second point", "Third point"], width: 430, height: 190, style: { ...base.style, fontSize: 18, backgroundColor: "#f3f5f9", borderColor: "#e4e8f0", borderWidth: 1, borderRadius: 22, padding: 22 } };
  if (type === "table") return { ...base, rows: [["Exercise", "Sets", "Reps"], ["Bench press", "4", "8"], ["Row", "4", "10"]], width: 600, height: 190, style: { ...base.style, fontSize: 15, backgroundColor: "#ffffff", borderColor: "#dfe4ee", borderWidth: 1, borderRadius: 18, padding: 14 } };
  if (type === "image") return { ...base, width: 500, height: 280, style: { ...base.style, backgroundColor: "#eef1f6", borderRadius: 24, padding: 0 } };
  return { ...base, width: 260, height: 160, style: { ...base.style, backgroundColor: "#6d5dfc", borderRadius: 26, padding: 0 } };
}

function starterLayers(kind: BuilderKind): BuilderLayer[] {
  const title = kind === "training_plan" ? "Performance Program" : kind === "diet_plan" ? "Nutrition Blueprint" : "Client Intake";
  const subtitle = kind === "training_plan" ? "A focused strength system built for measurable progress." : kind === "diet_plan" ? "Simple nutrition targets your client can execute every day." : "The context we need to coach the whole person.";
  const section = kind === "training_plan" ? "Day 1 · Upper strength" : kind === "diet_plan" ? "Daily targets" : "Body, lifestyle & goals";
  const items = kind === "training_plan" ? ["Bench press · 4 × 6", "Chest-supported row · 4 × 8", "DB shoulder press · 3 × 10", "Lat pulldown · 3 × 12"] : kind === "diet_plan" ? ["Protein · 180g", "Carbohydrates · 240g", "Fats · 70g", "Water · 3.5L"] : ["Current goals and timeline", "Training history", "Injuries or limitations", "Weekly availability"];
  const accent = kind === "training_plan" ? "#6d5dfc" : kind === "diet_plan" ? "#f59e0b" : "#06b6d4";
  const shape = (name: string, x: number, y: number, width: number, height: number, color: string, radius: number): BuilderLayer => ({ ...newLayer("shape", 0), id: id("layer"), name, x, y, width, height, style: { ...DEFAULT_LAYER_STYLE, backgroundColor: color, borderRadius: radius, padding: 0 } });
  const text = (name: string, value: string, x: number, y: number, width: number, height: number, size: number, color: string, weight: number): BuilderLayer => ({ ...newLayer("text", 0), id: id("layer"), name, text: value, x, y, width, height, style: { ...DEFAULT_LAYER_STYLE, fontFamily: size > 25 ? "Clash Display" : "Inter", fontSize: size, fontWeight: weight, lineHeight: size > 40 ? .98 : 1.35, color, padding: 0 } });
  const list = newLayer("checklist", 0);
  return [
    shape("Accent rail", 0, 0, 20, ARTBOARD_HEIGHT, accent, 0),
    shape("Coach note background", 60, 760, 700, 190, "#101827", 28),
    text("Program title", title, 60, 72, 680, 110, 58, "#111827", 700),
    text("Program introduction", subtitle, 62, 205, 610, 60, 18, "#68748a", 450),
    text("Section title", section, 62, 326, 650, 48, 28, "#111827", 650),
    { ...list, id: id("layer"), name: section, x: 60, y: 392, width: 700, height: 280, items, style: { ...list.style, fontSize: 19, color: "#26344e", backgroundColor: "#f3f5f9", borderColor: "#e3e7ef", borderWidth: 1, borderRadius: 26, padding: 28 } },
    text("Coach note label", "COACH NOTE", 94, 800, 180, 30, 12, accent, 700),
    text("Coach note", "Quality first. Keep every working set controlled and leave one clean rep in reserve.", 94, 842, 590, 72, 20, "#ffffff", 520)
  ];
}

function emptyDocument(kind: BuilderKind): BuilderDocument {
  const label = kind === "training_plan" ? "Performance Program" : kind === "diet_plan" ? "Nutrition Blueprint" : "Client Intake";
  return {
    id: "", title: label, description: "A fully customizable coaching document.", kind, theme: "studio", status: "draft",
    clientId: null, clientName: null, updatedAt: new Date().toISOString(), content: { version: 2, coverNote: "", sections: [], pages: [
      { id: id("page"), name: "Page 1", width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT, background: "#ffffff", layers: starterLayers(kind) }
    ] }
  };
}

function isTypingTarget(target: EventTarget | null) {
  return Boolean((target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']"));
}

export default function CoachBuilderPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient("coach"), []);
  const [profile, setProfile] = useState({ name: "Coach", handle: "@coach", role: "Coach", avatar: null as string | null });
  const [clients, setClients] = useState<BuilderStudioResponse["clients"]>([]);
  const [documents, setDocuments] = useState<BuilderDocument[]>([]);
  const [document, setDocument] = useState<BuilderDocument>(() => emptyDocument("training_plan"));
  const [pageId, setPageId] = useState("");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"elements" | "layers" | "drafts">("elements");
  const [mobilePanel, setMobilePanel] = useState<"library" | "properties" | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const historyRef = useRef<BuilderDocument[]>([]);
  const futureRef = useRef<BuilderDocument[]>([]);
  const uploadTargetRef = useRef<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const page = document.content.pages.find((item) => item.id === pageId) || document.content.pages[0];
  const selectedLayer = page?.layers.find((layer) => layer.id === selectedLayerId) || null;

  const replaceDocument = useCallback((next: BuilderDocument, remember = true) => {
    setDocument((current) => {
      if (remember) { historyRef.current = [...historyRef.current.slice(-39), current]; futureRef.current = []; }
      return next;
    });
  }, []);

  const updateDocument = useCallback((updater: (current: BuilderDocument) => BuilderDocument, remember = true) => {
    setDocument((current) => {
      const next = updater(current);
      if (next === current) return current;
      if (remember) { historyRef.current = [...historyRef.current.slice(-39), current]; futureRef.current = []; }
      return next;
    });
  }, []);

  const updatePage = useCallback((patch: Partial<BuilderPage>, remember = true) => {
    if (!page) return;
    updateDocument((current) => ({ ...current, content: { ...current.content, pages: current.content.pages.map((item) => item.id === page.id ? { ...item, ...patch } : item) } }), remember);
  }, [page, updateDocument]);

  const updateLayer = useCallback((layerId: string, patch: Partial<BuilderLayer>, remember = true) => {
    if (!page) return;
    updateDocument((current) => ({ ...current, content: { ...current.content, pages: current.content.pages.map((item) => item.id === page.id ? { ...item, layers: item.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer) } : item) } }), remember);
  }, [page, updateDocument]);

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1); if (!previous) return;
    historyRef.current = historyRef.current.slice(0, -1); futureRef.current = [document, ...futureRef.current.slice(0, 39)];
    setDocument(previous); setPageId(previous.content.pages[0]?.id || ""); setSelectedLayerId(null);
  }, [document]);

  const redo = useCallback(() => {
    const next = futureRef.current[0]; if (!next) return;
    futureRef.current = futureRef.current.slice(1); historyRef.current = [...historyRef.current.slice(-39), document];
    setDocument(next); setPageId(next.content.pages[0]?.id || ""); setSelectedLayerId(null);
  }, [document]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured || !supabase) { setError("Supabase is not configured for Builder."); setLoading(false); return; }
      const [{ data: sessionData }, { data: userData }] = await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);
      const user = userData.user;
      if (!sessionData.session?.access_token || !user) { setError("Your coach session expired. Please sign in again."); setLoading(false); return; }
      const name = (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) || user.email?.split("@")[0] || "Coach";
      if (active) setProfile({ name, handle: user.email ? `@${user.email.split("@")[0]}` : "@coach", role: "Coach", avatar: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null });
      try {
        const response = await fetch("/api/coach/builder", { headers: { authorization: `Bearer ${sessionData.session.access_token}` } });
        const payload = await response.json() as BuilderStudioResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load Builder.");
        if (!active) return;
        const initial = payload.documents[0] || emptyDocument("training_plan");
        setClients(payload.clients); setDocuments(payload.documents); setDocument(initial); setPageId(initial.content.pages[0]?.id || "");
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load Builder."); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    const viewport = viewportRef.current; if (!viewport) return;
    const resize = () => { const available = viewport.clientWidth - (window.innerWidth < 768 ? 28 : 96); setZoom(Math.max(0.28, Math.min(0.82, available / ARTBOARD_WIDTH))); };
    resize(); const observer = new ResizeObserver(resize); observer.observe(viewport); return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      if (!selectedLayer) return;
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteLayer(); return; }
      const delta = event.shiftKey ? 8 : 1;
      if (event.key === "ArrowLeft") updateLayer(selectedLayer.id, { x: selectedLayer.x - delta });
      if (event.key === "ArrowRight") updateLayer(selectedLayer.id, { x: selectedLayer.x + delta });
      if (event.key === "ArrowUp") updateLayer(selectedLayer.id, { y: selectedLayer.y - delta });
      if (event.key === "ArrowDown") updateLayer(selectedLayer.id, { y: selectedLayer.y + delta });
    }
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  });

  function addLayer(type: BuilderLayerType) {
    if (!page) return; const layer = newLayer(type, page.layers.length);
    updatePage({ layers: [...page.layers, layer] }); setSelectedLayerId(layer.id); setMobilePanel(null);
    if (type === "image") window.setTimeout(() => openUpload(layer.id), 50);
  }

  function duplicateLayer() {
    if (!selectedLayer || !page) return;
    const clone = { ...selectedLayer, id: id("layer"), name: `${selectedLayer.name} copy`, x: selectedLayer.x + 20, y: selectedLayer.y + 20, style: { ...selectedLayer.style }, items: [...selectedLayer.items], rows: selectedLayer.rows.map((row) => [...row]) };
    updatePage({ layers: [...page.layers, clone] }); setSelectedLayerId(clone.id);
  }

  function deleteLayer() { if (!selectedLayer || !page) return; updatePage({ layers: page.layers.filter((layer) => layer.id !== selectedLayer.id) }); setSelectedLayerId(null); }
  function arrangeLayer(direction: "front" | "back") { if (!selectedLayer || !page) return; const remaining = page.layers.filter((layer) => layer.id !== selectedLayer.id); updatePage({ layers: direction === "front" ? [...remaining, selectedLayer] : [selectedLayer, ...remaining] }); }
  function addPage() { const next: BuilderPage = { id: id("page"), name: `Page ${document.content.pages.length + 1}`, width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT, background: "#ffffff", layers: [] }; updateDocument((current) => ({ ...current, content: { ...current.content, pages: [...current.content.pages, next] } })); setPageId(next.id); setSelectedLayerId(null); }
  function openUpload(layerId: string) { uploadTargetRef.current = layerId; uploadInputRef.current?.click(); }

  async function upload(file: File | null) {
    const layerId = uploadTargetRef.current; if (!file || !layerId || !supabase) return; setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error("Your coach session expired.");
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/coach/builder/upload", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` }, body });
      const payload = await response.json() as { url?: string; path?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to upload this image.");
      updateLayer(layerId, { imageUrl: payload.url, imagePath: payload.path || null }); setSuccess("Image added to the canvas.");
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Image upload failed."); }
    finally { if (uploadInputRef.current) uploadInputRef.current.value = ""; }
  }

  async function persist(source = document) {
    if (!supabase) throw new Error("Supabase is unavailable."); setSaving(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error("Your coach session expired.");
      const response = await fetch("/api/coach/builder", { method: "POST", headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(source) });
      const payload = await response.json() as { document?: BuilderDocument; error?: string };
      if (!response.ok || !payload.document) throw new Error(payload.error || "Unable to save this document.");
      setDocument(payload.document); setDocuments((current) => [payload.document!, ...current.filter((item) => item.id !== payload.document!.id)]); setSuccess("Saved."); return payload.document;
    } finally { setSaving(false); }
  }

  async function save() { try { await persist(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Save failed."); } }
  async function send() {
    if (!supabase) return; setSending(true); setError(null);
    try {
      if (!document.clientId) throw new Error("Choose a client before sending."); const saved = await persist();
      const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error("Your coach session expired.");
      const response = await fetch("/api/coach/builder/send", { method: "POST", headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ documentId: saved.id }) });
      const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || "Unable to send this plan.");
      setDocument((current) => ({ ...current, status: "sent" })); setSuccess("Plan sent to your client.");
    } catch (sendError) { setError(sendError instanceof Error ? sendError.message : "Send failed."); } finally { setSending(false); }
  }

  async function generate(prompt: string, conversation: CopilotMessage[]) {
    if (!supabase) throw new Error("Supabase is unavailable."); setGenerating(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error("Your coach session expired.");
      const response = await fetch("/api/coach/builder/ai", { method: "POST", headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ prompt, document, conversation: conversation.slice(0, -1) }) });
      const payload = await response.json() as { document?: BuilderDocument; message?: string; error?: string };
      if (!response.ok || !payload.document) throw new Error(payload.error || "Grok could not update the canvas.");
      replaceDocument(payload.document); setPageId(payload.document.content.pages[0]?.id || ""); setSelectedLayerId(null); setSuccess("Grok’s design is now editable on your canvas.");
      return payload.message || "I rebuilt the plan as editable layers on your canvas.";
    } finally { setGenerating(false); }
  }

  function switchTemplate(kind: BuilderKind) { const next = emptyDocument(kind); next.clientId = document.clientId; next.clientName = document.clientName; replaceDocument(next); setPageId(next.content.pages[0].id); setSelectedLayerId(null); }

  if (loading) return <CoachShell profile={profile}><div className="skeleton min-h-[calc(100dvh-112px)] rounded-3xl" /></CoachShell>;

  return (
    <CoachShell profile={profile}>
      <div className="builder-studio">
        <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0] || null)} />
        <header className="builder-studio-topbar">
          <div className="flex min-w-0 items-center gap-2">
            <input value={document.title} onChange={(event) => updateDocument((current) => ({ ...current, title: event.target.value }), false)} className="min-w-0 max-w-[240px] bg-transparent font-display text-sm font-semibold text-white outline-none sm:text-base" aria-label="Document title" />
            <span className="hidden rounded-full bg-white/[0.055] px-2.5 py-1 text-[10px] capitalize text-white/42 sm:inline">{document.status}</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={undo} className="builder-icon-button" title="Undo" aria-label="Undo"><Undo2 /></button><button type="button" onClick={redo} className="builder-icon-button" title="Redo" aria-label="Redo"><Redo2 /></button>
            <span className="mx-1 hidden h-6 w-px bg-white/[0.07] sm:block" />
            <button type="button" onClick={() => setCopilotOpen(true)} className="builder-ai-button" aria-label="Build with Grok"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Build with Grok</span></button>
            <button type="button" onClick={() => void save()} disabled={saving} className="builder-secondary-button h-10" aria-label={saving ? "Saving" : "Save document"}><Save className="h-4 w-4" /><span className="hidden md:inline">{saving ? "Saving" : "Save"}</span></button>
            <button type="button" onClick={() => void send()} disabled={sending} className="builder-primary-button h-10" aria-label={sending ? "Sending" : "Send to client"}><Send className="h-4 w-4" /><span className="hidden md:inline">{sending ? "Sending" : "Send"}</span></button>
          </div>
        </header>

        {error || success ? <div className={`builder-toast ${error ? "builder-toast-error" : "builder-toast-success"}`}><span>{error || success}</span><button type="button" onClick={() => { setError(null); setSuccess(null); }}>×</button></div> : null}

        <div className="builder-studio-body">
          <aside className={`builder-library ${mobilePanel === "library" ? "builder-mobile-panel-open" : ""}`}>
            <div className="grid grid-cols-3 gap-1 border-b border-white/[0.06] p-2">
              {(["elements", "layers", "drafts"] as const).map((tab) => <button key={tab} type="button" onClick={() => setLeftTab(tab)} className={`rounded-lg px-2 py-2 text-[11px] font-medium capitalize ${leftTab === tab ? "bg-white/[0.08] text-white" : "text-white/38"}`}>{tab}</button>)}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {leftTab === "elements" ? <>
                <p className="builder-panel-label">Templates</p>
                <div className="mt-2 space-y-2">{templates.map(({ kind, label, description, icon: Icon }) => <button key={kind} type="button" onClick={() => switchTemplate(kind)} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.035] p-3 text-left transition hover:bg-white/[0.07]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-blue-300"><Icon className="h-4 w-4" /></span><span><strong className="block text-xs text-white/80">{label}</strong><span className="mt-0.5 block text-[10px] leading-4 text-white/32">{description}</span></span></button>)}</div>
                <p className="builder-panel-label mt-6">Add elements</p>
                <div className="mt-2 grid grid-cols-2 gap-2">{elementButtons.map(({ type, label, icon: Icon }) => <button key={type} type="button" onClick={() => addLayer(type)} className="flex min-h-[72px] flex-col items-start justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"><Icon className="h-4 w-4" /><span>{label}</span></button>)}</div>
              </> : null}
              {leftTab === "layers" ? <>
                <div className="flex items-center justify-between"><p className="builder-panel-label">Layers</p><span className="text-[10px] text-white/25">{page?.layers.length || 0}</span></div>
                <div className="mt-2 space-y-1">{[...(page?.layers || [])].reverse().map((layer) => <button key={layer.id} type="button" onClick={() => { setSelectedLayerId(layer.id); setMobilePanel(null); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left ${selectedLayerId === layer.id ? "bg-blue-500/15 text-blue-200" : "text-white/52 hover:bg-white/[0.04]"}`}><Layers3 className="h-3.5 w-3.5 shrink-0" /><span className="truncate text-xs">{layer.name}</span></button>)}</div>
              </> : null}
              {leftTab === "drafts" ? <>
                <p className="builder-panel-label">Saved work</p>
                <div className="mt-2 space-y-2">{documents.length ? documents.map((item) => <button key={item.id} type="button" onClick={() => { replaceDocument(item); setPageId(item.content.pages[0]?.id || ""); setSelectedLayerId(null); setMobilePanel(null); }} className={`w-full rounded-xl p-3 text-left ${document.id === item.id ? "bg-blue-500/12" : "bg-white/[0.035] hover:bg-white/[0.06]"}`}><strong className="block truncate text-xs text-white/75">{item.title}</strong><span className="mt-1 block text-[10px] capitalize text-white/30">{item.kind.replaceAll("_", " ")} · {item.status}</span></button>) : <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/30">No saved drafts yet.</p>}</div>
              </> : null}
            </div>
            <button type="button" onClick={() => setMobilePanel(null)} className="builder-mobile-done">Done</button>
          </aside>

          <section className="builder-workspace">
            <div className="builder-canvas-toolbar">
              <button type="button" onClick={() => setMobilePanel("library")} className="builder-mobile-tool"><Plus className="h-4 w-4" />Add</button>
              <button type="button" onClick={() => setSnapToGrid((value) => !value)} className={snapToGrid ? "builder-toolbar-active" : ""}><AlignHorizontalSpaceAround className="h-4 w-4" />Snap</button>
              <div className="ml-auto flex items-center gap-1"><button type="button" onClick={() => setZoom((value) => Math.max(0.25, value - 0.08))}><ZoomOut className="h-4 w-4" /></button><span className="w-10 text-center text-[11px] text-white/40">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.25, value + 0.08))}><ZoomIn className="h-4 w-4" /></button></div>
              <button type="button" onClick={() => setMobilePanel("properties")} className="builder-mobile-tool"><PanelRight className="h-4 w-4" />Style</button>
            </div>
            <div ref={viewportRef} className="builder-canvas-viewport">{page ? <BuilderCanvas page={page} scale={zoom} selectedLayerId={selectedLayerId} snapToGrid={snapToGrid} onSelect={setSelectedLayerId} onChangeLayer={updateLayer} onUpload={openUpload} /> : null}</div>
            <div className="builder-pages-strip">
              {document.content.pages.map((item, index) => <button key={item.id} type="button" onClick={() => { setPageId(item.id); setSelectedLayerId(null); }} className={page?.id === item.id ? "builder-page-active" : ""}><span className="builder-page-thumbnail" style={{ background: item.background }} /><span>{index + 1}</span></button>)}
              <button type="button" onClick={addPage} className="builder-add-page"><Plus className="h-4 w-4" />Add page</button>
            </div>
          </section>

          <aside className={`builder-properties ${mobilePanel === "properties" ? "builder-mobile-panel-open" : ""}`}>
            <div className="border-b border-white/[0.06] px-4 py-3">
              <label className="block text-[11px] font-medium text-white/38">Client</label>
              <div className="relative mt-1.5"><select value={document.clientId || ""} onChange={(event) => { const client = clients.find((item) => item.id === event.target.value); updateDocument((current) => ({ ...current, clientId: client?.id || null, clientName: client?.name || null })); }} className="h-10 w-full appearance-none rounded-xl border border-white/[0.07] bg-white/[0.055] px-3 pr-8 text-sm text-white outline-none"><option value="">Choose a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-white/30" /></div>
            </div>
            {page ? <BuilderProperties layer={selectedLayer} page={page} onChange={(patch) => selectedLayer && updateLayer(selectedLayer.id, patch)} onChangePage={updatePage} onDuplicate={duplicateLayer} onDelete={deleteLayer} onArrange={arrangeLayer} onUpload={() => selectedLayer && openUpload(selectedLayer.id)} /> : null}
            <button type="button" onClick={() => setMobilePanel(null)} className="builder-mobile-done">Done</button>
          </aside>
        </div>

        <button type="button" onClick={() => setCopilotOpen(true)} className="builder-floating-ai" aria-label="Open Grok Studio"><Bot className="h-5 w-5" /><span>Ask Grok</span></button>
        {copilotOpen ? <button type="button" className="builder-copilot-backdrop" onClick={() => setCopilotOpen(false)} aria-label="Close Grok Studio" /> : null}
        {copilotOpen ? <BuilderCopilot open generating={generating} onClose={() => setCopilotOpen(false)} onGenerate={generate} /> : null}
      </div>
    </CoachShell>
  );
}
