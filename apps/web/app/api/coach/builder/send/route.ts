import { getAuthenticatedUserFromToken, sendBuilderDocument } from "../../../../../lib/builder-studio";

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

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const payload = (await request.json()) as { documentId?: string };
    if (!payload.documentId) {
      return Response.json({ error: "Document ID is required." }, { status: 400 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    await sendBuilderDocument(user, payload.documentId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to send builder document.") }, { status: 500 });
  }
}
