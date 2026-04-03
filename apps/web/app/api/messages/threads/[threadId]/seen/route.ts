import { getAuthenticatedUserFromToken } from "../../../../../../lib/coach-dashboard-server";
import { markThreadSeenForUser } from "../../../../../../lib/messages-server";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

export async function POST(request: Request, { params }: { params: { threadId: string } }) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    await markThreadSeenForUser(user, params.threadId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to mark this conversation as seen." },
      { status: 500 }
    );
  }
}
