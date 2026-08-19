import type { User } from "@supabase/supabase-js";
import { ensureCoachBootstrapped, getAuthenticatedUserFromToken } from "./coach-dashboard-server";
import { ensureConversationForPair } from "./messages-server";
import { getSupabaseAdminClient } from "./supabase-admin";
import {
  ARTBOARD_HEIGHT,
  ARTBOARD_WIDTH,
  DEFAULT_LAYER_STYLE,
  type BuilderClient as BuilderClientOption,
  type BuilderContent,
  type BuilderDocument as BuilderDocumentRecord,
  type BuilderKind,
  type BuilderLayer,
  type BuilderLayerStyle,
  type BuilderPage,
  type LegacyBuilderSection
} from "./builder-types";

export type { BuilderContent, BuilderKind } from "./builder-types";
export type { BuilderDocument as BuilderDocumentRecord } from "./builder-types";

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDefaultBuilderContent(kind: BuilderKind): BuilderContent {
  const accent = kind === "diet_plan" ? "#f59e0b" : kind === "onboarding_form" ? "#06b6d4" : "#6d5dfc";
  const title = kind === "diet_plan" ? "Nutrition Blueprint" : kind === "onboarding_form" ? "Client Intake" : "Performance Program";
  const subtitle = kind === "diet_plan" ? "A simple system for consistent nutrition." : kind === "onboarding_form" ? "Everything we need to build the right plan." : "Strength, intent, and progression—mapped clearly.";
  const sectionOne = kind === "diet_plan" ? "Daily targets" : kind === "onboarding_form" ? "Body & health" : "Day 1 · Upper strength";
  const sectionTwo = kind === "diet_plan" ? "Meal structure" : kind === "onboarding_form" ? "Lifestyle & goals" : "Coaching notes";
  const firstItems = kind === "diet_plan"
    ? ["Protein · 180g", "Carbohydrates · 240g", "Fats · 70g", "Water · 3.5L"]
    : kind === "onboarding_form"
      ? ["Age and current weight", "Injuries or limitations", "Training experience"]
      : ["Bench press · 4 × 6", "Chest-supported row · 4 × 8", "DB shoulder press · 3 × 10", "Lat pulldown · 3 × 12"];
  const secondItems = kind === "diet_plan"
    ? ["Breakfast · protein + slow carbs", "Lunch · lean protein + vegetables", "Dinner · protein + flexible carbs"]
    : kind === "onboarding_form"
      ? ["Primary outcome", "Weekly availability", "Nutrition challenges"]
      : ["Leave 1–2 reps in reserve", "Control every eccentric", "Add load only when form stays clean"];

  const makeStyle = (overrides: Partial<BuilderLayerStyle> = {}): BuilderLayerStyle => ({ ...DEFAULT_LAYER_STYLE, ...overrides });
  const layers: BuilderLayer[] = [
    {
      id: randomId("layer"), type: "shape", name: "Accent rail", x: 0, y: 0, width: 22, height: ARTBOARD_HEIGHT,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: "", items: [], rows: [], imageUrl: null, imagePath: null,
      style: makeStyle({ backgroundColor: accent, borderRadius: 0, padding: 0 })
    },
    {
      id: randomId("layer"), type: "text", name: "Program title", x: 64, y: 72, width: 650, height: 120,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: title, items: [], rows: [], imageUrl: null, imagePath: null,
      style: makeStyle({ fontFamily: "Clash Display", fontSize: 58, fontWeight: 700, lineHeight: 0.98, color: "#0c1322", padding: 0 })
    },
    {
      id: randomId("layer"), type: "text", name: "Program introduction", x: 68, y: 205, width: 560, height: 70,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: subtitle, items: [], rows: [], imageUrl: null, imagePath: null,
      style: makeStyle({ fontSize: 18, fontWeight: 450, color: "#647089", padding: 0 })
    },
    {
      id: randomId("layer"), type: "text", name: "Section one title", x: 68, y: 330, width: 320, height: 52,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: sectionOne, items: [], rows: [], imageUrl: null, imagePath: null,
      style: makeStyle({ fontFamily: "Clash Display", fontSize: 28, fontWeight: 650, color: "#0c1322", padding: 0 })
    },
    {
      id: randomId("layer"), type: "checklist", name: sectionOne, x: 60, y: 390, width: 700, height: 250,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: "", items: firstItems, rows: [], imageUrl: null, imagePath: null,
      style: makeStyle({ fontSize: 18, color: "#27344d", backgroundColor: "#f3f5fa", borderColor: "#e8ebf3", borderWidth: 1, borderRadius: 24, padding: 24 })
    },
    {
      id: randomId("layer"), type: "text", name: "Section two title", x: 68, y: 690, width: 320, height: 52,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: sectionTwo, items: [], rows: [], imageUrl: null, imagePath: null,
      style: makeStyle({ fontFamily: "Clash Display", fontSize: 28, fontWeight: 650, color: "#0c1322", padding: 0 })
    },
    {
      id: randomId("layer"), type: "checklist", name: sectionTwo, x: 60, y: 750, width: 700, height: 220,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: "", items: secondItems, rows: [], imageUrl: null, imagePath: null,
      style: makeStyle({ fontSize: 18, color: "#27344d", backgroundColor: "#ffffff", borderColor: "#dde2ed", borderWidth: 1, borderRadius: 24, padding: 24 })
    }
  ];

  return {
    version: 2,
    coverNote: subtitle,
    pages: [{ id: randomId("page"), name: "Page 1", width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT, background: "#ffffff", layers }],
    sections: [
      { id: randomId("section"), title: sectionOne, items: firstItems },
      { id: randomId("section"), title: sectionTwo, items: secondItems }
    ]
  };
}

function normalizeStyle(style: unknown): BuilderLayerStyle {
  const value = style && typeof style === "object" ? style as Partial<BuilderLayerStyle> : {};
  return {
    ...DEFAULT_LAYER_STYLE,
    ...value,
    fontFamily: ["Inter", "Clash Display", "Georgia", "JetBrains Mono"].includes(String(value.fontFamily)) ? value.fontFamily as BuilderLayerStyle["fontFamily"] : "Inter",
    textAlign: ["left", "center", "right"].includes(String(value.textAlign)) ? value.textAlign as BuilderLayerStyle["textAlign"] : "left",
    objectFit: value.objectFit === "contain" ? "contain" : "cover"
  };
}

function normalizeLayer(layer: unknown, index: number): BuilderLayer {
  const value = layer && typeof layer === "object" ? layer as Partial<BuilderLayer> : {};
  const types = ["text", "checklist", "table", "image", "shape"];
  return {
    id: typeof value.id === "string" && value.id ? value.id : randomId("layer"),
    type: types.includes(String(value.type)) ? value.type as BuilderLayer["type"] : "text",
    name: typeof value.name === "string" ? value.name.slice(0, 80) : `Layer ${index + 1}`,
    x: Math.max(0, Math.min(ARTBOARD_WIDTH - 40, Number(value.x) || 0)),
    y: Math.max(0, Math.min(ARTBOARD_HEIGHT - 40, Number(value.y) || 0)),
    width: Math.max(40, Math.min(ARTBOARD_WIDTH, Number(value.width) || 240)),
    height: Math.max(32, Math.min(ARTBOARD_HEIGHT, Number(value.height) || 100)),
    rotation: Math.max(-180, Math.min(180, Number(value.rotation) || 0)),
    opacity: Math.max(0.05, Math.min(1, Number(value.opacity) || 1)),
    locked: Boolean(value.locked),
    hidden: Boolean(value.hidden),
    text: typeof value.text === "string" ? value.text.slice(0, 4000) : "",
    items: Array.isArray(value.items) ? value.items.slice(0, 40).map((item) => String(item).slice(0, 500)) : [],
    rows: Array.isArray(value.rows) ? value.rows.slice(0, 30).map((row) => Array.isArray(row) ? row.slice(0, 8).map((cell) => String(cell).slice(0, 300)) : []) : [],
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : null,
    imagePath: typeof value.imagePath === "string" ? value.imagePath : null,
    style: normalizeStyle(value.style)
  };
}

function legacySectionsToPage(sections: LegacyBuilderSection[], kind: BuilderKind): BuilderPage {
  const fallback = getDefaultBuilderContent(kind).pages[0];
  if (!sections.length) return fallback;
  const layers: BuilderLayer[] = [];
  sections.slice(0, 8).forEach((section, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 54 + column * 360;
    const y = 140 + row * 220;
    layers.push({
      id: randomId("layer"), type: "text", name: `${section.title} title`, x, y, width: 320, height: 42,
      rotation: 0, opacity: 1, locked: false, hidden: false, text: section.title, items: [], rows: [], imageUrl: null, imagePath: null,
      style: { ...DEFAULT_LAYER_STYLE, fontFamily: "Clash Display", fontSize: 25, fontWeight: 650, padding: 0, color: "#101828" }
    });
    layers.push({
      id: randomId("layer"), type: section.type === "image" ? "image" : "checklist", name: section.title, x, y: y + 52,
      width: section.span === 2 ? 700 : 320, height: section.type === "image" ? 180 : 145, rotation: 0, opacity: 1, locked: false, hidden: false,
      text: section.imageCaption || "", items: section.items || [], rows: [], imageUrl: section.imageUrl || null, imagePath: section.imagePath || null,
      style: { ...DEFAULT_LAYER_STYLE, fontSize: 15, backgroundColor: "#f5f7fb", borderColor: "#e4e7ee", borderWidth: 1, borderRadius: 18, padding: 18 }
    });
  });
  return { ...fallback, id: randomId("page"), layers };
}

function deriveLegacySections(pages: BuilderPage[]): LegacyBuilderSection[] {
  return pages.flatMap((page) => page.layers.filter((layer) => layer.type === "checklist" || layer.type === "table" || layer.type === "image").map((layer) => ({
    id: randomId("section"),
    title: layer.name || "Plan section",
    items: layer.type === "table" ? layer.rows.map((row) => row.join(" · ")) : layer.items,
    type: layer.type === "image" ? "image" as const : "text" as const,
    imageUrl: layer.imageUrl,
    imagePath: layer.imagePath,
    imageCaption: layer.text,
    span: layer.width > ARTBOARD_WIDTH * 0.65 ? 2 as const : 1 as const,
    height: layer.height > 300 ? "lg" as const : layer.height < 180 ? "sm" as const : "md" as const
  })));
}

export function normalizeBuilderContent(kind: BuilderKind, content: unknown): BuilderContent {
  const fallback = getDefaultBuilderContent(kind);

  if (!content || typeof content !== "object") {
    return fallback;
  }

  const parsed = content as Partial<BuilderContent>;
  const legacySections = Array.isArray(parsed.sections) ? parsed.sections : fallback.sections;
  const pages: BuilderPage[] = Array.isArray(parsed.pages) && parsed.pages.length
    ? parsed.pages.slice(0, 12).map((page, pageIndex) => ({
        id: typeof page?.id === "string" && page.id ? page.id : randomId("page"),
        name: typeof page?.name === "string" ? page.name.slice(0, 80) : `Page ${pageIndex + 1}`,
        width: ARTBOARD_WIDTH,
        height: ARTBOARD_HEIGHT,
        background: typeof page?.background === "string" ? page.background.slice(0, 120) : "#ffffff",
        layers: Array.isArray(page?.layers) ? page.layers.slice(0, 80).map(normalizeLayer) : []
      }))
    : [legacySectionsToPage(legacySections, kind)];
  return {
    version: 2,
    coverNote: typeof parsed.coverNote === "string" ? parsed.coverNote : fallback.coverNote,
    pages,
    sections: deriveLegacySections(pages)
  };
}

export async function getBuilderStudioData(user: User) {
  const supabase = getSupabaseAdminClient();
  await ensureCoachBootstrapped(user);

  const [clientsResponse, documentsResponse, profilesResponse] = await Promise.all([
    supabase.from("clients").select("id, status").eq("coach_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("builder_documents")
      .select("id, title, description, kind, theme, status, client_id, updated_at, content")
      .eq("coach_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").in("id", [user.id, ...((await supabase.from("clients").select("id").eq("coach_id", user.id)).data || []).map((row) => row.id)])
  ]);

  if (clientsResponse.error) throw clientsResponse.error;
  if (documentsResponse.error) throw documentsResponse.error;
  if (profilesResponse.error) throw profilesResponse.error;

  const profileMap = new Map((profilesResponse.data || []).map((profile) => [profile.id, profile.full_name]));

  const authUsers = new Map(
    await Promise.all(
      (clientsResponse.data || []).map(async (client) => {
        const response = await supabase.auth.admin.getUserById(client.id);
        return [client.id, response.data.user || null] as const;
      })
    )
  );

  const clients: BuilderClientOption[] = (clientsResponse.data || []).map((client) => ({
    id: client.id,
    name: profileMap.get(client.id) || "Client",
    email: authUsers.get(client.id)?.email || null,
    status: client.status
  }));

  const documents: BuilderDocumentRecord[] = (documentsResponse.data || []).map((document) => ({
    id: document.id,
    title: document.title,
    description: document.description || "",
    kind: document.kind as BuilderKind,
    theme: document.theme,
    status: document.status,
    clientId: document.client_id,
    clientName: document.client_id ? profileMap.get(document.client_id) || null : null,
    updatedAt: document.updated_at,
    content: normalizeBuilderContent(document.kind as BuilderKind, document.content)
  }));

  return { clients, documents };
}

export async function saveBuilderDocument(
  user: User,
  payload: {
    id?: string;
    title: string;
    description: string;
    kind: BuilderKind;
    theme: string;
    clientId: string | null;
    content: BuilderContent;
  }
) {
  const supabase = getSupabaseAdminClient();
  await ensureCoachBootstrapped(user);

  const normalizedContent = normalizeBuilderContent(payload.kind, payload.content);
  const documentPayload = {
    coach_id: user.id,
    client_id: payload.clientId,
    title: payload.title.trim() || "Untitled Builder Document",
    description: payload.description.trim(),
    kind: payload.kind,
    theme: payload.theme || "obsidian",
    content: normalizedContent,
    updated_at: new Date().toISOString()
  };

  const response = payload.id
    ? await supabase
        .from("builder_documents")
        .update(documentPayload)
        .eq("id", payload.id)
        .eq("coach_id", user.id)
        .select("id, title, description, kind, theme, status, client_id, updated_at, content")
        .single()
    : await supabase
        .from("builder_documents")
        .insert(documentPayload)
        .select("id, title, description, kind, theme, status, client_id, updated_at, content")
        .single();

  if (response.error || !response.data) {
    throw response.error || new Error("Unable to save builder document.");
  }

  return {
    id: response.data.id,
    title: response.data.title,
    description: response.data.description || "",
    kind: response.data.kind as BuilderKind,
    theme: response.data.theme,
    status: response.data.status,
    clientId: response.data.client_id,
    clientName: null,
    updatedAt: response.data.updated_at,
    content: normalizeBuilderContent(response.data.kind as BuilderKind, response.data.content)
  } satisfies BuilderDocumentRecord;
}

export async function sendBuilderDocument(user: User, documentId: string) {
  const supabase = getSupabaseAdminClient();
  await ensureCoachBootstrapped(user);

  const { data: document, error: documentError } = await supabase
    .from("builder_documents")
    .select("id, title, kind, client_id")
    .eq("id", documentId)
    .eq("coach_id", user.id)
    .single();

  if (documentError || !document) {
    throw documentError || new Error("Builder document not found.");
  }

  if (!document.client_id) {
    throw new Error("Assign a client before sending this document.");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, coach_id, room_id")
    .eq("id", document.client_id)
    .eq("coach_id", user.id)
    .single();

  if (clientError || !client) {
    throw clientError || new Error("Assigned client not found.");
  }

  const conversationId = await ensureConversationForPair(user.id, client.id, client.room_id || null);
  const messageBody = `New ${document.kind.replace(/_/g, " ")} delivered: ${document.title}`;
  const now = new Date().toISOString();

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: user.id,
    body: messageBody
  });

  if (messageError) throw messageError;

  const { error: conversationError } = await supabase
    .from("conversations")
    .update({
      last_message_preview: messageBody,
      last_message_at: now,
      last_sender_profile_id: user.id,
      coach_last_seen_at: now
    })
    .eq("id", conversationId);

  if (conversationError) throw conversationError;

  const { error: documentUpdateError } = await supabase
    .from("builder_documents")
    .update({ status: "sent", updated_at: now })
    .eq("id", documentId)
    .eq("coach_id", user.id);

  if (documentUpdateError) throw documentUpdateError;

  return { ok: true };
}

export { getAuthenticatedUserFromToken };
