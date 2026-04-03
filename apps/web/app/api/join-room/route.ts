import type { OnboardingSurveyPayload } from "@heimdallfit/types";
import { isValidRoomId, normalizeRoomId } from "@heimdallfit/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as OnboardingSurveyPayload;
  const roomId = normalizeRoomId(payload.roomId);

  if (!isValidRoomId(roomId)) {
    return Response.json({ error: "Invalid room ID." }, { status: 400 });
  }

  return Response.json({
    status: "pending",
    pendingClient: {
      id: crypto.randomUUID(),
      coachId: "coach_demo_01",
      roomId,
      goals: payload.goals,
      injuries: payload.injuries,
      createdAt: new Date().toISOString()
    },
    notification: "Coach push notification queued."
  });
}
