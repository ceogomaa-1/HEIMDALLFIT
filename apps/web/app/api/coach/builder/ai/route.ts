import { getAuthenticatedUserFromToken, normalizeBuilderContent } from "../../../../../lib/builder-studio";
import type { BuilderDocument, BuilderKind } from "../../../../../lib/builder-types";

export const runtime = "nodejs";
export const maxDuration = 300;

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
}

const styleProperties = {
  fontFamily: { type: "string", enum: ["Inter", "Clash Display", "Georgia", "JetBrains Mono"] },
  fontSize: { type: "number", minimum: 8, maximum: 120 },
  fontWeight: { type: "number", minimum: 300, maximum: 800 },
  lineHeight: { type: "number", minimum: 0.8, maximum: 2.5 },
  letterSpacing: { type: "number", minimum: -4, maximum: 20 },
  textAlign: { type: "string", enum: ["left", "center", "right"] },
  color: { type: "string" },
  backgroundColor: { type: "string" },
  borderColor: { type: "string" },
  borderWidth: { type: "number", minimum: 0, maximum: 12 },
  borderRadius: { type: "number", minimum: 0, maximum: 100 },
  padding: { type: "number", minimum: 0, maximum: 80 },
  objectFit: { type: "string", enum: ["cover", "contain"] }
};

const layerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "name", "x", "y", "width", "height"],
  properties: {
    id: { type: "string", maxLength: 48 },
    type: { type: "string", enum: ["text", "checklist", "table", "image", "shape"] },
    name: { type: "string", maxLength: 80 },
    x: { type: "number", minimum: 0, maximum: 780 },
    y: { type: "number", minimum: 0, maximum: 1020 },
    width: { type: "number", minimum: 40, maximum: 820 },
    height: { type: "number", minimum: 32, maximum: 1060 },
    rotation: { type: "number", minimum: -180, maximum: 180 },
    opacity: { type: "number", minimum: 0.05, maximum: 1 },
    locked: { type: "boolean" },
    hidden: { type: "boolean" },
    text: { type: "string", maxLength: 1600 },
    items: { type: "array", items: { type: "string", maxLength: 220 }, maxItems: 24 },
    rows: { type: "array", items: { type: "array", items: { type: "string", maxLength: 180 }, maxItems: 8 }, maxItems: 20 },
    imageUrl: { type: ["string", "null"], maxLength: 1200 },
    imagePath: { type: ["string", "null"], maxLength: 500 },
    style: {
      type: "object",
      additionalProperties: false,
      properties: styleProperties
    }
  }
};

const responseSchema = {
  name: "heimdallfit_builder_document",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["message", "title", "description", "kind", "theme", "coverNote", "pages"],
    properties: {
      message: { type: "string", maxLength: 600 },
      title: { type: "string", maxLength: 140 },
      description: { type: "string", maxLength: 500 },
      kind: { type: "string", enum: ["onboarding_form", "diet_plan", "training_plan"] },
      theme: { type: "string", maxLength: 80 },
      coverNote: { type: "string", maxLength: 1200 },
      pages: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "name", "width", "height", "background", "layers"],
          properties: {
            id: { type: "string", maxLength: 48 },
            name: { type: "string", maxLength: 80 },
            width: { type: "number", enum: [820] },
            height: { type: "number", enum: [1060] },
            background: { type: "string", maxLength: 120 },
            layers: { type: "array", minItems: 1, maxItems: 18, items: layerSchema }
          }
        }
      }
    }
  }
};

type GeneratedDocument = {
  message: string;
  title: string;
  description: string;
  kind: BuilderKind;
  theme: string;
  coverNote: string;
  pages: unknown[];
};

type XaiResult = {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string };
  }>;
  error?: { message?: string };
};

class RueOutputError extends Error {}

class RueServiceError extends Error {
  constructor(readonly status: number) {
    super(`Rue provider request failed with status ${status}.`);
  }
}

function parseGeneratedDocument(content: string): GeneratedDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new RueOutputError("Rue returned malformed structured output.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new RueOutputError("Rue returned an invalid document.");
  }

  const candidate = parsed as Partial<GeneratedDocument>;
  if (
    typeof candidate.message !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.description !== "string" ||
    !["onboarding_form", "diet_plan", "training_plan"].includes(String(candidate.kind)) ||
    typeof candidate.theme !== "string" ||
    typeof candidate.coverNote !== "string" ||
    !Array.isArray(candidate.pages) ||
    candidate.pages.length === 0
  ) {
    throw new RueOutputError("Rue returned an incomplete document.");
  }

  return candidate as GeneratedDocument;
}

function friendlyServiceMessage(status: number) {
  if (status === 429) return "Rue is handling a lot of requests right now. Give it a moment, then try again.";
  if (status === 401 || status === 403) return "Rue is temporarily unavailable while its connection is being refreshed.";
  return "Rue couldn’t reach the design service right now. Your canvas is safe—please try again shortly.";
}

type RueMessage = { role: "system" | "user" | "assistant"; content: string };

async function requestRueDocument(apiKey: string, messages: RueMessage[], compactRetry: boolean) {
  const retryInstruction: RueMessage[] = compactRetry ? [{
    role: "user",
    content: "Retry the same request as a compact canvas document. Preserve the useful coaching detail, but consolidate it into tables and checklists, use no more than 14 layers per page, and omit optional/default/empty layer properties. The response must finish as complete valid JSON."
  }] : [];

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-build-latest",
      reasoning_effort: "low",
      max_tokens: 24000,
      messages: [...messages, ...retryInstruction],
      response_format: { type: "json_schema", json_schema: responseSchema }
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
  if (choice?.finish_reason === "length") {
    throw new RueOutputError("Rue reached the output limit before completing the document.");
  }

  const content = choice?.message?.content;
  if (!content) throw new RueOutputError("Rue returned an empty document.");
  return parseGeneratedDocument(content);
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) return Response.json({ error: "Missing authorization token." }, { status: 401 });
    await getAuthenticatedUserFromToken(token);

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Rue isn’t connected to the design service in this environment yet." }, { status: 503 });
    }

    const body = await request.json() as { prompt?: string; document?: BuilderDocument; conversation?: Array<{ role: "user" | "assistant"; content: string }> };
    const prompt = body.prompt?.trim().slice(0, 5000);
    if (!prompt) return Response.json({ error: "Tell Rue what you want to build or change." }, { status: 400 });

    const current = body.document;
    const conversation = Array.isArray(body.conversation) ? body.conversation.slice(-8).map((message) => ({ role: message.role, content: message.content.slice(0, 2000) })) : [];
    const system = `You are Rue, HEIMDALLFIT's elite fitness-program designer and editorial art director embedded in a visual canvas editor.

Return a complete, editable document—not prose. Create exceptionally clear, premium layouts that feel like a top fitness publication, with strong hierarchy and generous whitespace. Every visual object must be an independent layer placed inside an 820 × 1060 artboard.

Rules:
- Use text layers for headings, subheadings, paragraphs, labels and callouts.
- Use checklist layers for exercises, habits, ingredients, questions, or steps.
- Use table layers when rows and columns improve scanning (sets/reps/rest, meals/macros, schedules).
- Use shape layers behind content for color fields, dividers, pills, and cards. Put background shapes before foreground layers in the array.
- Image layers may preserve image URLs already in the current document, but never invent an image URL. Use an empty string when no image is available.
- Keep all layers inside the artboard without overlaps that obscure content. Use 44px minimum touch-readable content sizing where appropriate and at least 32px page margins.
- Use no more than 24 layers per page. Add pages when needed instead of cramming.
- Write concrete coaching content customized to the prompt. Avoid filler language.
- Fitness and nutrition content is educational coaching material, not diagnosis or medical treatment. Flag contraindications and professional-referral needs in the plan when relevant.
- Colors must be valid CSS hex values. Page background may be a hex color or a CSS linear-gradient.
- Every required field must be returned. IDs must be short unique strings.
- Keep the response compact. Prefer a table or checklist over many separate text layers, and omit optional properties when they are empty or equal to their normal defaults.
- In message, briefly explain what you created or changed in a warm, direct tone.`;

    const currentContext = current ? JSON.stringify({
      title: current.title,
      description: current.description,
      kind: current.kind,
      theme: current.theme,
      hasAssignedClient: Boolean(current.clientId),
      content: current.content
    }) : "No document exists yet.";

    const messages: RueMessage[] = [
      { role: "system", content: system },
      ...conversation,
      { role: "user", content: `Current editable document:\n${currentContext}\n\nCoach request:\n${prompt}` }
    ];

    let generated: GeneratedDocument;
    try {
      generated = await requestRueDocument(apiKey, messages, false);
    } catch (error) {
      if (!(error instanceof RueOutputError)) throw error;
      console.warn("[Rue Builder] Retrying compact generation", { reason: error.message });
      generated = await requestRueDocument(apiKey, messages, true);
    }

    const normalized = normalizeBuilderContent(generated.kind, { version: 2, coverNote: generated.coverNote, pages: generated.pages, sections: [] });
    const document: BuilderDocument = {
      id: current?.id || "",
      title: generated.title.slice(0, 140),
      description: generated.description.slice(0, 500),
      kind: generated.kind,
      theme: generated.theme.slice(0, 80),
      status: current?.status || "draft",
      clientId: current?.clientId || null,
      clientName: current?.clientName || null,
      updatedAt: new Date().toISOString(),
      content: normalized
    };

    return Response.json({ message: generated.message, document });
  } catch (error) {
    console.error("[Rue Builder] Generation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure"
    });
    const message = error instanceof RueServiceError
      ? friendlyServiceMessage(error.status)
      : error instanceof RueOutputError
        ? "Rue couldn’t finish this design cleanly. Your canvas is safe—please try the request once more."
        : error instanceof Error && error.name === "TimeoutError"
          ? "Rue needs a little longer for that design. Try again with a more focused request."
          : "Rue couldn’t update the canvas this time. Your existing work is safe—please try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
