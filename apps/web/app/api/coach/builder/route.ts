import { getAuthenticatedUserFromToken, getBuilderStudioData, saveBuilderDocument } from "../../../../lib/builder-studio";
import type { BuilderContent, BuilderKind } from "../../../../lib/builder-types";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? error.message : null;
    if (typeof maybeMessage === "string" && maybeMessage) return maybeMessage;
    const maybeDetails = "details" in error ? error.details : null;
    if (typeof maybeDetails === "string" && maybeDetails) return maybeDetails;
    const maybeHint = "hint" in error ? error.hint : null;
    if (typeof maybeHint === "string" && maybeHint) return maybeHint;
  }
  return fallback;
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const payload = await getBuilderStudioData(user);
    return Response.json(payload);
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to load builder studio.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      id?: string;
      title?: string;
      description?: string;
      kind?: BuilderKind;
      theme?: string;
      clientId?: string | null;
      content?: BuilderContent;
    };

    const user = await getAuthenticatedUserFromToken(token);
    const document = await saveBuilderDocument(user, {
      id: payload.id,
      title: payload.title || "",
      description: payload.description || "",
      kind: payload.kind || "training_plan",
      theme: payload.theme || "obsidian",
      clientId: payload.clientId || null,
      content: payload.content || ({ coverNote: "", pages: [], sections: [], version: 2 } satisfies BuilderContent)
    });

    return Response.json({ document });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to save builder document.") }, { status: 500 });
  }
}
