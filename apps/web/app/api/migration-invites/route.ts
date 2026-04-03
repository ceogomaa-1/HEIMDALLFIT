import { appConfig } from "@heimdallfit/config";
import type { InvitePayload } from "@heimdallfit/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as InvitePayload;
  const fallbackBase = `${appConfig.appUrl}/join/${payload.coachId}`;

  const invites = payload.contacts.map((contact) => {
    const label = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email || contact.phone || "Unknown";
    const deepLink = `${appConfig.deepLinkBase}/${payload.coachId}`;
    return {
      contactLabel: label,
      deepLink,
      fallbackUrl: fallbackBase,
      message: `Join my room on HEIMDALLFIT: ${deepLink} or ${fallbackBase}`
    };
  });

  return Response.json({ invites });
}
