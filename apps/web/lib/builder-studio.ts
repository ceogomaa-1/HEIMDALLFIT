import type { User } from "@supabase/supabase-js";
import { ensureCoachBootstrapped, getAuthenticatedUserFromToken } from "./coach-dashboard-server";
import { ensureConversationForPair } from "./messages-server";
import { getSupabaseAdminClient } from "./supabase-admin";

export type BuilderKind = "onboarding_form" | "diet_plan" | "training_plan";

export type BuilderSection = {
  id: string;
  title: string;
  items: string[];
};

export type BuilderContent = {
  coverNote: string;
  sections: BuilderSection[];
};

export type BuilderDocumentRecord = {
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

export type BuilderClientOption = {
  id: string;
  name: string;
  email: string | null;
  status: string;
};

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDefaultBuilderContent(kind: BuilderKind): BuilderContent {
  if (kind === "onboarding_form") {
    return {
      coverNote: "Use this form to understand your client's body, goals, schedule, and training history before delivery starts.",
      sections: [
        {
          id: randomId("section"),
          title: "Core Intake",
          items: ["What is your age?", "What is your current weight?", "What injuries or limitations should I know about?"]
        },
        {
          id: randomId("section"),
          title: "Lifestyle",
          items: ["How many days per week can you train?", "How many meals do you usually eat per day?", "How much water do you drink daily?"]
        }
      ]
    };
  }

  if (kind === "diet_plan") {
    return {
      coverNote: "Build the diet flow, meals, timing, and coaching notes exactly how you want the client to follow them.",
      sections: [
        {
          id: randomId("section"),
          title: "Morning",
          items: ["Meal 1: Protein + oats + fruit", "Hydration target: 750ml before noon", "Supplements: multivitamin + omega-3"]
        },
        {
          id: randomId("section"),
          title: "Evening",
          items: ["Meal 4: Lean protein + potatoes + greens", "Post-dinner walk: 10-15 mins", "No sugary snacks after 9 PM"]
        }
      ]
    };
  }

  return {
    coverNote: "Map out the exact weekly training structure, execution cues, and progression notes before sending to your client.",
    sections: [
      {
        id: randomId("section"),
        title: "Day 1 - Push",
        items: ["Bench Press - 4 x 8", "Incline Dumbbell Press - 3 x 10", "Cable Lateral Raise - 3 x 15"]
      },
      {
        id: randomId("section"),
        title: "Conditioning",
        items: ["Bike sprint: 10 rounds x 20s on / 40s off", "Cooldown walk: 8 mins", "Breathing reset: 3 mins"]
      }
    ]
  };
}

function normalizeContent(kind: BuilderKind, content: unknown): BuilderContent {
  const fallback = getDefaultBuilderContent(kind);

  if (!content || typeof content !== "object") {
    return fallback;
  }

  const parsed = content as Partial<BuilderContent>;
  return {
    coverNote: typeof parsed.coverNote === "string" ? parsed.coverNote : fallback.coverNote,
    sections: Array.isArray(parsed.sections)
      ? parsed.sections.map((section) => ({
          id: typeof section?.id === "string" ? section.id : randomId("section"),
          title: typeof section?.title === "string" ? section.title : "Untitled Section",
          items: Array.isArray(section?.items) ? section.items.map((item) => String(item)) : []
        }))
      : fallback.sections
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
    content: normalizeContent(document.kind as BuilderKind, document.content)
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

  const normalizedContent = normalizeContent(payload.kind, payload.content);
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
    content: normalizeContent(response.data.kind as BuilderKind, response.data.content)
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
