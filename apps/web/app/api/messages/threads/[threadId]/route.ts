import { getAuthenticatedUserFromToken } from "../../../../../lib/coach-dashboard-server";
import { getThreadMessagesForUser, sendMessageForUser } from "../../../../../lib/messages-server";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

export async function GET(request: Request, { params }: { params: { threadId: string } }) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const payload = await getThreadMessagesForUser(user, params.threadId);
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load this conversation." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { threadId: string } }) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const contentType = request.headers.get("content-type") || "";
    let body = "";
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = String(formData.get("body") || "");
      files = formData.getAll("files").filter((file): file is File => file instanceof File);
    } else {
      const payload = (await request.json()) as { body?: string };
      body = payload.body || "";
    }

    const message = await sendMessageForUser(user, params.threadId, body, files);
    return Response.json({ message });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to send this message." },
      { status: 500 }
    );
  }
}
