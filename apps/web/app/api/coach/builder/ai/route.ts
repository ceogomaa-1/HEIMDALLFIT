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
  required: ["id", "type", "name", "x", "y", "width", "height", "rotation", "opacity", "locked", "hidden", "text", "items", "rows", "imageUrl", "imagePath", "style"],
  properties: {
    id: { type: "string" },
    type: { type: "string", enum: ["text", "checklist", "table", "image", "shape"] },
    name: { type: "string" },
    x: { type: "number", minimum: 0, maximum: 780 },
    y: { type: "number", minimum: 0, maximum: 1020 },
    width: { type: "number", minimum: 40, maximum: 820 },
    height: { type: "number", minimum: 32, maximum: 1060 },
    rotation: { type: "number", minimum: -180, maximum: 180 },
    opacity: { type: "number", minimum: 0.05, maximum: 1 },
    locked: { type: "boolean" },
    hidden: { type: "boolean" },
    text: { type: "string" },
    items: { type: "array", items: { type: "string" }, maxItems: 40 },
    rows: { type: "array", items: { type: "array", items: { type: "string" }, maxItems: 8 }, maxItems: 30 },
    imageUrl: { type: "string" },
    imagePath: { type: "string" },
    style: {
      type: "object",
      additionalProperties: false,
      required: Object.keys(styleProperties),
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
      message: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      kind: { type: "string", enum: ["onboarding_form", "diet_plan", "training_plan"] },
      theme: { type: "string" },
      coverNote: { type: "string" },
      pages: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "name", "width", "height", "background", "layers"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            width: { type: "number", enum: [820] },
            height: { type: "number", enum: [1060] },
            background: { type: "string" },
            layers: { type: "array", minItems: 1, maxItems: 30, items: layerSchema }
          }
        }
      }
    }
  }
};

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) return Response.json({ error: "Missing authorization token." }, { status: 401 });
    await getAuthenticatedUserFromToken(token);

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Grok is ready in the Builder, but XAI_API_KEY has not been added to this environment yet." }, { status: 503 });
    }

    const body = await request.json() as { prompt?: string; document?: BuilderDocument; conversation?: Array<{ role: "user" | "assistant"; content: string }> };
    const prompt = body.prompt?.trim().slice(0, 5000);
    if (!prompt) return Response.json({ error: "Tell Grok what you want to build or change." }, { status: 400 });

    const current = body.document;
    const conversation = Array.isArray(body.conversation) ? body.conversation.slice(-8).map((message) => ({ role: message.role, content: message.content.slice(0, 2000) })) : [];
    const system = `You are HEIMDALLFIT Studio Copilot, an elite fitness-program designer and editorial art director embedded in a visual canvas editor.

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
- In message, briefly explain what you created or changed in a warm, direct tone.`;

    const currentContext = current ? JSON.stringify({
      title: current.title,
      description: current.description,
      kind: current.kind,
      theme: current.theme,
      hasAssignedClient: Boolean(current.clientId),
      content: current.content
    }) : "No document exists yet.";

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-build-latest",
        reasoning_effort: "low",
        max_tokens: 12000,
        messages: [
          { role: "system", content: system },
          ...conversation,
          { role: "user", content: `Current editable document:\n${currentContext}\n\nCoach request:\n${prompt}` }
        ],
        response_format: { type: "json_schema", json_schema: responseSchema }
      })
    });

    const rawResult = await response.text();
    let result: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    try {
      result = JSON.parse(rawResult) as typeof result;
    } catch {
      throw new Error(response.ok
        ? "Grok returned an unreadable response. Please try again."
        : `Grok request failed (${response.status}). Please try again.`);
    }
    if (!response.ok) throw new Error(result.error?.message || "Grok could not generate the plan.");
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Grok returned an empty plan.");

    const generated = JSON.parse(content) as { message: string; title: string; description: string; kind: BuilderKind; theme: string; coverNote: string; pages: unknown[] };
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
    const message = error instanceof Error ? error.message : "Grok could not update the canvas.";
    return Response.json({ error: message }, { status: 500 });
  }
}
