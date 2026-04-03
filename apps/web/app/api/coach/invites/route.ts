import { ensureCoachBootstrapped, getAuthenticatedUserFromToken } from "../../../../lib/coach-dashboard-server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function getBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

async function sendInviteEmail({
  to,
  clientName,
  coachName,
  roomCode,
  inviteUrl,
  subject,
  coachMessage
}: {
  to: string;
  clientName: string;
  coachName: string;
  roomCode: string;
  inviteUrl: string;
  subject: string;
  coachMessage?: string;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw new Error("RESEND_API_KEY is missing from the server environment.");
  }

  const from = process.env.RESEND_FROM_EMAIL || "HEIMDALLFIT <welcome@heimdallfit.com>";
  const messageBlock = coachMessage
    ? `
        <div style="margin:20px 0;padding:18px 20px;border-radius:20px;background:#16161d;border:1px solid rgba(255,255,255,0.08)">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.45)">Message From Your Coach</p>
          <p style="margin:0;font-size:15px;line-height:1.8;color:rgba(255,255,255,0.8);white-space:pre-line">${coachMessage}</p>
        </div>
      `
    : "";

  const html = `
    <div style="background:#0b0b10;padding:32px;font-family:Inter,Arial,sans-serif;color:#f5f5f5">
      <div style="max-width:640px;margin:0 auto;background:#14141b;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px">
        <p style="font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin:0 0 16px">HEIMDALLFIT</p>
        <h1 style="font-size:32px;line-height:1.05;margin:0 0 18px">Welcome to HEIMDALLFIT!</h1>
        <p style="font-size:16px;line-height:1.7;color:rgba(255,255,255,0.76);margin:0 0 14px">
          Hi ${clientName},
        </p>
        <p style="font-size:16px;line-height:1.7;color:rgba(255,255,255,0.76);margin:0 0 14px">
          Your coach <strong style="color:#fff">${coachName}</strong> is waiting for you in their room.
        </p>
        <div style="margin:24px 0;padding:18px 20px;border-radius:20px;background:#1d1d25;border:1px solid rgba(255,255,255,0.08)">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.45)">Room Code</p>
          <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.08em">${roomCode}</p>
        </div>
        <p style="font-size:15px;line-height:1.7;color:rgba(255,255,255,0.76);margin:0 0 12px">
          DO NOT SHARE THIS ROOM CODE WITH OTHER PEOPLE WITHOUT YOUR COACH APPROVAL FIRST.
        </p>
        ${messageBlock}
        <a href="${inviteUrl}" style="display:inline-block;margin-top:18px;padding:14px 22px;border-radius:999px;background:#ffffff;color:#000;text-decoration:none;font-weight:700">
          Access your new dashboard
        </a>
        <p style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.52);margin:22px 0 0">
          See you there ;)
        </p>
      </div>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Resend could not send the invite email.");
  }

  return payload;
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("room_join_requests")
      .select("id, client_name, client_email, status, created_at, accepted_at")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({
      invites: (data || []).map((invite) => ({
        id: invite.id,
        clientName: invite.client_name || "Client",
        clientEmail: invite.client_email || "No email",
        status: invite.status,
        createdAt: invite.created_at,
        acceptedAt: invite.accepted_at
      }))
    });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to load invites.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const body = await request.json();
    const clientName = String(body.clientName || "").trim();
    const clientEmail = String(body.clientEmail || "").trim().toLowerCase();
    const subject = String(body.subject || "").trim();
    const coachMessage = String(body.coachMessage || "").trim();

    if (!clientName) {
      return Response.json({ error: "Client name is required." }, { status: 400 });
    }

    if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return Response.json({ error: "A valid client email is required." }, { status: 400 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const supabase = getSupabaseAdminClient();
    const room = await ensureCoachBootstrapped(user);

    const [{ data: profile }, { data: coach }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.from("coaches").select("brand_name").eq("id", user.id).single()
    ]);

    const coachName = coach?.brand_name || profile?.full_name || "Your coach";
    const inviteToken = crypto.randomUUID();
    const inviteUrl = `${getBaseUrl(request)}/client/auth?invite=${inviteToken}`;
    const emailSubject = subject || `Welcome to HEIMDALLFIT, ${clientName}`;

    const { data: invite, error: inviteError } = await supabase
      .from("room_join_requests")
      .insert({
        coach_id: user.id,
        room_id: room.id,
        client_name: clientName,
        client_email: clientEmail,
        invite_token: inviteToken,
        status: "pending"
      })
      .select("id, created_at, status")
      .single();

    if (inviteError || !invite) {
      throw inviteError || new Error("Unable to create the onboarding invite.");
    }

    await sendInviteEmail({
      to: clientEmail,
      clientName,
      coachName,
      roomCode: room.room_id,
      inviteUrl,
      subject: emailSubject,
      coachMessage
    });

    return Response.json({
      invite: {
        id: invite.id,
        clientName,
        clientEmail,
        status: invite.status,
        createdAt: invite.created_at,
        inviteUrl,
        roomCode: room.room_id
      }
    });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to send onboarding invite.") }, { status: 500 });
  }
}
