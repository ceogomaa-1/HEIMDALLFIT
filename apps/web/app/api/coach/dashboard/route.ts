import { getAuthenticatedUserFromToken, getCoachDashboardData } from "../../../../lib/coach-dashboard-server";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const dashboard = await getCoachDashboardData(user);

    return Response.json(dashboard);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to load coach dashboard."
      },
      { status: 500 }
    );
  }
}
