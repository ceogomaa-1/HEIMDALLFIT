import { getAuthenticatedUserFromToken } from "../../../../../../lib/coach-dashboard-server";
import { submitOnboardingForClient } from "../../../../../../lib/messages-server";

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

    const payload = (await request.json()) as {
      age?: string;
      weight?: string;
      injuries?: string;
      goals?: string;
    };

    const user = await getAuthenticatedUserFromToken(token);
    const onboarding = await submitOnboardingForClient(user, params.threadId, {
      age: payload.age || "",
      weight: payload.weight || "",
      injuries: payload.injuries || "",
      goals: payload.goals || ""
    });

    return Response.json({ onboarding });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to submit onboarding." },
      { status: 500 }
    );
  }
}
