import { ensureClientProfile, getAuthenticatedUserFromToken } from "../../../../lib/coach-dashboard-server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { resolveStorageAssetUrl } from "../../../../lib/storage";

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

function toHandle(value: string) {
  return `@${value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "client"}`;
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatWeight(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not provided";
  return `${value} lb`;
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const user = await getAuthenticatedUserFromToken(token);
    const supabase = getSupabaseAdminClient();
    await ensureClientProfile(user);

    const [{ data: profile }, { data: clientRecord }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("clients").select("coach_id, room_id, status, current_weight, created_at").eq("id", user.id).maybeSingle()
    ]);

    const name =
      profile?.full_name ||
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name
        : user.email?.split("@")[0] || "Client");

    const avatar = await resolveStorageAssetUrl(
      supabase,
      "coach-branding",
      profile?.avatar_url || (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null)
    );

    if (!clientRecord?.coach_id) {
      return Response.json({
        profile: {
          id: user.id,
          name,
          handle: user.email ? toHandle(user.email.split("@")[0]) : "@client",
          role: "Client",
          avatar
        },
        linkedCoach: null,
        stats: {
          membershipStatus: "Not connected",
          joinedDate: "Not set",
          currentWeight: "Not provided",
          assignedPrograms: 0,
          storeItems: 0
        },
        programs: [],
        store: [],
        notifications: [
          "You have not joined a coach room yet.",
          "Use 'Find your coach' or enter a room ID to connect."
        ]
      });
    }

    const [{ data: room }, { data: coach }, { data: coachProfile }, { data: subscription }, { data: programs }, { data: products }, { data: joinRequest }, { data: survey }] =
      await Promise.all([
        supabase.from("rooms").select("room_id, room_name, brand_tagline").eq("id", clientRecord.room_id).maybeSingle(),
        supabase.from("coaches").select("brand_name, bio, specialty, banner_url").eq("id", clientRecord.coach_id).maybeSingle(),
        supabase.from("profiles").select("full_name, avatar_url").eq("id", clientRecord.coach_id).maybeSingle(),
        supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("coach_id", clientRecord.coach_id)
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("programs")
          .select("id, title, sport, created_at")
          .eq("coach_id", clientRecord.coach_id)
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("store_products")
          .select("id, title, description, price, type, asset_url")
          .eq("coach_id", clientRecord.coach_id)
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(4),
        user.email
          ? supabase
              .from("room_join_requests")
              .select("id, created_at")
              .eq("coach_id", clientRecord.coach_id)
              .eq("client_email", user.email.toLowerCase())
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        user.email
          ? supabase
              .from("room_join_requests")
              .select("id")
              .eq("coach_id", clientRecord.coach_id)
              .eq("client_email", user.email.toLowerCase())
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(async ({ data }) => {
                if (!data?.id) return { data: null };
                return supabase
                  .from("onboarding_surveys")
                  .select("age, weight, goals, injuries")
                  .eq("room_join_request_id", data.id)
                  .maybeSingle();
              })
          : Promise.resolve({ data: null })
      ]);

    const [coachAvatar, coachBanner] = await Promise.all([
      resolveStorageAssetUrl(supabase, "coach-branding", coachProfile?.avatar_url || null),
      resolveStorageAssetUrl(supabase, "coach-branding", coach?.banner_url || null)
    ]);

    return Response.json({
      profile: {
        id: user.id,
        name,
        handle: user.email ? toHandle(user.email.split("@")[0]) : "@client",
        role: "Client",
        avatar
      },
      linkedCoach: {
        name: coach?.brand_name || coachProfile?.full_name || "Coach",
        specialty: coach?.specialty || "Performance Coaching",
        bio: coach?.bio || "Your coach is ready to guide your progress inside HEIMDALLFIT.",
        avatar: coachAvatar,
        banner: coachBanner,
        roomId: room?.room_id || "Unavailable",
        roomName: room?.room_name || "Coach Room",
        tagline: room?.brand_tagline || "Invite, manage, and win."
      },
      stats: {
        membershipStatus: subscription?.status || clientRecord.status,
        joinedDate: formatShortDate(joinRequest?.created_at || clientRecord.created_at),
        currentWeight: formatWeight(clientRecord.current_weight ?? survey?.weight ?? null),
        assignedPrograms: programs?.length || 0,
        storeItems: products?.length || 0
      },
      programs: (programs || []).map((program) => ({
        id: program.id,
        title: program.title,
        sport: program.sport,
        createdAt: formatShortDate(program.created_at)
      })),
      store: (products || []).map((product) => ({
        id: product.id,
        title: product.title,
        subtitle: product.description || "Coach-curated digital product",
        priceLabel: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        }).format(Number(product.price)),
        image: product.asset_url || null,
        type: product.type
      })),
      notifications: [
        `${coach?.brand_name || coachProfile?.full_name || "Your coach"} is connected to your room.`,
        survey?.goals ? `Goals on file: ${survey.goals}` : "Complete your onboarding form once messaging is live.",
        survey?.injuries ? `Coach note: injuries listed for training awareness.` : "No injuries listed yet."
      ]
    });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error, "Unable to load client dashboard.") }, { status: 500 });
  }
}
