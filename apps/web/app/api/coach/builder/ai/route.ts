import { getAuthenticatedUserFromToken, normalizeBuilderContent } from "../../../../../lib/builder-studio";
import { composeRuePages, parseRuePlan, RUE_RESPONSE_SCHEMA, type RuePlan } from "../../../../../lib/rue-builder";
import type { BuilderDocument } from "../../../../../lib/builder-types";

export const runtime = "nodejs";
export const maxDuration = 300;

type RueMessage = { role: "system" | "user" | "assistant"; content: string };
type XaiResult = {
  choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
  error?: { message?: string };
};

class RueOutputError extends Error {}
class RueServiceError extends Error {
  constructor(readonly status: number) {
    super(`Rue provider request failed with status ${status}.`);
  }
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
}

function compactCurrentDocument(current?: BuilderDocument) {
  if (!current) return "No document exists yet.";
  return JSON.stringify({
    title: current.title,
    description: current.description,
    kind: current.kind,
    theme: current.theme,
    hasAssignedClient: Boolean(current.clientId),
    pages: current.content.pages.slice(0, 5).map((page) => ({
      name: page.name,
      content: page.layers
        .filter((layer) => layer.type !== "shape")
        .slice(0, 16)
        .map((layer) => ({
          type: layer.type,
          name: layer.name,
          text: layer.text.slice(0, 500),
          items: layer.items.slice(0, 8),
          rows: layer.rows.slice(0, 8)
        }))
    }))
  });
}

async function requestRuePlan(apiKey: string, messages: RueMessage[], compactRetry: boolean) {
  const retryInstruction: RueMessage[] = compactRetry ? [{
    role: "user",
    content: "Retry the same plan in the most concise valid form. Keep every requested day and the essential coaching detail, use tables for repeated exercise data, and return complete JSON."
  }] : [];

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(compactRetry ? 55_000 : 85_000),
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-4.3-latest",
      reasoning_effort: "low",
      max_tokens: 8000,
      messages: [...messages, ...retryInstruction],
      response_format: { type: "json_schema", json_schema: RUE_RESPONSE_SCHEMA }
    })
  });

  const rawResult = await response.text();
  let result: XaiResult;
  try {
    result = JSON.parse(rawResult) as XaiResult;
  } catch {
    if (response.ok) throw new RueOutputError("Rue returned an unreadable provider response.");
    throw new RueServiceError(response.status);
  }

  if (!response.ok) {
    console.error("[Rue Builder] Provider rejected generation", { status: response.status, providerMessage: result.error?.message });
    throw new RueServiceError(response.status);
  }

  const choice = result.choices?.[0];
  if (choice?.finish_reason === "length") throw new RueOutputError("Rue reached the output limit.");
  const content = choice?.message?.content;
  if (!content) throw new RueOutputError("Rue returned an empty plan.");

  try {
    return parseRuePlan(content);
  } catch {
    throw new RueOutputError("Rue returned malformed plan data.");
  }
}

function friendlyServiceMessage(status: number) {
  if (status === 429) return "Rue is handling a lot of requests right now. Give it a moment, then try again.";
  if (status === 401 || status === 403) return "Rue is temporarily unavailable while its connection is being refreshed.";
  return "Rue couldn’t reach the design service right now. Your canvas is safe—please try again shortly.";
}

function friendlyGenerationError(error: unknown) {
  console.error("[Rue Builder] Generation failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown failure"
  });
  if (error instanceof RueServiceError) return friendlyServiceMessage(error.status);
  if (error instanceof RueOutputError) return "Rue couldn’t finish this design cleanly. Your canvas is safe—please try once more.";
  if (error instanceof Error && error.name === "TimeoutError") return "Rue’s design service took too long to answer. Your canvas is safe—please try again.";
  return "Rue couldn’t update the canvas this time. Your existing work is safe—please try again.";
}

function heartbeatJson(work: () => Promise<unknown>) {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (value: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(value));
        } catch {
          closed = true;
        }
      };

      enqueue(" ".repeat(2048));
      heartbeat = setInterval(() => enqueue(" ".repeat(2048)), 5000);

      void work()
        .then((payload) => enqueue(JSON.stringify(payload)))
        .catch((error) => enqueue(JSON.stringify({ error: friendlyGenerationError(error) })))
        .finally(() => {
          if (heartbeat) clearInterval(heartbeat);
          if (!closed) {
            closed = true;
            controller.close();
          }
        });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-cache, no-store, no-transform",
      "x-accel-buffering": "no"
    }
  });
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Missing authorization token." }, { status: 401 });

  try {
    await getAuthenticatedUserFromToken(token);
  } catch {
    return Response.json({ error: "Your coach session expired. Please sign in again." }, { status: 401 });
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return Response.json({ error: "Rue isn’t connected to the design service in this environment yet." }, { status: 503 });

  let body: { prompt?: string; document?: BuilderDocument; conversation?: Array<{ role: "user" | "assistant"; content: string }> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Rue couldn’t read that request. Please send it again." }, { status: 400 });
  }

  const prompt = body.prompt?.trim().slice(0, 5000);
  if (!prompt) return Response.json({ error: "Tell Rue what you want to build or change." }, { status: 400 });

  const current = body.document;
  const conversation = Array.isArray(body.conversation)
    ? body.conversation.slice(-6).map((message) => ({ role: message.role, content: message.content.slice(0, 1200) }))
    : [];
  const system = `You are Rue, HEIMDALLFIT's elite fitness-program designer and editorial art director.

Create the semantic content for a premium editable fitness, nutrition, or onboarding document. HEIMDALLFIT—not you—will turn your semantic pages and blocks into polished positioned canvas layers. Do not return coordinates, layer styles, colors, image URLs, or rendering instructions.

Rules:
- Make the content concrete, useful, and customized to the coach's request.
- For multi-day programs, use one overview page plus one page per day when space permits.
- Use table blocks for exercises, sets, reps, rest, tempo, meals, macros, or schedules.
- Use list blocks for habits, questions, cues, ingredients, or steps.
- Use text sparingly and callouts for progression, safety, substitutions, or coaching priorities.
- Each page may contain at most three blocks. Keep table rows to eight and list items to eight.
- Put content only in the matching field: rows for tables, items for lists, body for text/callouts. Keep the other fields empty.
- Fitness and nutrition content is educational coaching material, not diagnosis or medical treatment. Include relevant contraindications or referral guidance.
- Choose a visual theme that fits the request.
- In message, briefly explain what you built in a warm, direct tone.`;

  const messages: RueMessage[] = [
    { role: "system", content: system },
    ...conversation,
    { role: "user", content: `Current document summary:\n${compactCurrentDocument(current)}\n\nCoach request:\n${prompt}` }
  ];

  return heartbeatJson(async () => {
    let generated: RuePlan;
    try {
      generated = await requestRuePlan(apiKey, messages, false);
    } catch (error) {
      if (!(error instanceof RueOutputError)) throw error;
      console.warn("[Rue Builder] Retrying compact semantic generation", { reason: error.message });
      generated = await requestRuePlan(apiKey, messages, true);
    }

    const pages = composeRuePages(generated);
    const normalized = normalizeBuilderContent(generated.kind, {
      version: 2,
      coverNote: generated.coverNote,
      pages,
      sections: []
    });
    const document: BuilderDocument = {
      id: current?.id || "",
      title: generated.title.slice(0, 140),
      description: generated.description.slice(0, 500),
      kind: generated.kind,
      theme: generated.theme,
      status: current?.status || "draft",
      clientId: current?.clientId || null,
      clientName: current?.clientName || null,
      updatedAt: new Date().toISOString(),
      content: normalized
    };

    return { message: generated.message, document };
  });
}
