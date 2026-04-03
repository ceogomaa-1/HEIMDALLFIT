import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "./supabase-admin";
import type { CoachDashboardClient, CoachDashboardResponse, CoachDashboardStoreItem } from "./coach-dashboard-types";
import { resolveStorageAssetUrl } from "./storage";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function fallbackCoachName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";

  if (metadataName) return metadataName;
  if (user.email) return user.email.split("@")[0].replace(/[._-]+/g, " ");
  return "Coach";
}

function toHandle(value: string) {
  return `@${value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "coach"}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "No recent visit";

  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return "No recent visit";

  const diffMs = target - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  return rtf.format(diffMonths, "month");
}

function formatWeight(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not provided";
  return `${value} lb`;
}

function createRoomId() {
  return Array.from({ length: 8 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join("");
}

async function generateUniqueRoomId() {
  const supabase = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const roomId = createRoomId();
    const { data } = await supabase.from("rooms").select("id").eq("room_id", roomId).maybeSingle();

    if (!data) {
      return roomId;
    }
  }

  throw new Error("Unable to generate a unique room ID.");
}

export async function getAuthenticatedUserFromToken(token: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(error?.message || "Invalid session.");
  }

  return data.user;
}

export async function getProfileRole(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.role || null;
}

export async function ensureCoachBootstrapped(user: User) {
  const supabase = getSupabaseAdminClient();
  const fullName = fallbackCoachName(user);
  const brandName = `${fullName} Coaching`;
  const metadataAvatar = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const [existingProfileResponse, existingCoachResponse] = await Promise.all([
    supabase.from("profiles").select("id, role, full_name, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("coaches").select("id, brand_name, specialty, bio").eq("id", user.id).maybeSingle()
  ]);

  if (existingProfileResponse.data?.role && existingProfileResponse.data.role !== "coach") {
    throw new Error("This account is registered as a client and cannot access the coach portal.");
  }

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      role: "coach",
      full_name: existingProfileResponse.data?.full_name || fullName,
      avatar_url: existingProfileResponse.data?.avatar_url || metadataAvatar
    },
    { onConflict: "id" }
  );

  await supabase.from("coaches").upsert(
    {
      id: user.id,
      brand_name: existingCoachResponse.data?.brand_name || brandName,
      specialty:
        existingCoachResponse.data?.specialty ||
        (typeof user.user_metadata?.specialty === "string" && user.user_metadata.specialty.trim()
          ? user.user_metadata.specialty
          : "Performance Coaching"),
      bio:
        existingCoachResponse.data?.bio ||
        (typeof user.user_metadata?.bio === "string" && user.user_metadata.bio.trim()
          ? user.user_metadata.bio
          : "Coach workspace for clients, programs, onboarding, and sales.")
    },
    { onConflict: "id" }
  );

  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_id, room_name, brand_tagline")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (room) {
    return room;
  }

  const roomId = await generateUniqueRoomId();
  const { data: insertedRoom, error } = await supabase
    .from("rooms")
    .insert({
      coach_id: user.id,
      room_id: roomId,
      room_name: `${fullName}'s Room`,
      brand_tagline: "Invite, manage, and win."
    })
    .select("id, room_id, room_name, brand_tagline")
    .single();

  if (error || !insertedRoom) {
    throw new Error(error?.message || "Unable to create coach room.");
  }

  return insertedRoom;
}

export async function ensureClientProfile(user: User) {
  const supabase = getSupabaseAdminClient();
  const existingProfileResponse = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileResponse.error) {
    throw new Error(existingProfileResponse.error.message);
  }

  if (existingProfileResponse.data?.role && existingProfileResponse.data.role !== "client") {
    throw new Error("This account is registered as a coach and cannot access the client portal.");
  }

  const fullName = fallbackCoachName(user);
  const metadataAvatar = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      role: "client",
      full_name: existingProfileResponse.data?.full_name || fullName,
      avatar_url: existingProfileResponse.data?.avatar_url || metadataAvatar
    },
    { onConflict: "id" }
  );
}

function getMonthBucketKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildClientOverviewTrend(clientDates: string[]) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(today.getDate() - (6 - index));

    return clientDates.filter((value) => {
      const created = new Date(value);
      created.setHours(0, 0, 0, 0);
      return created.getTime() <= start.getTime();
    }).length;
  });
}

function getProfileCompleteness(parts: Array<boolean>) {
  const filled = parts.filter(Boolean).length;
  return Math.round((filled / parts.length) * 100);
}

export async function getCoachDashboardData(user: User): Promise<CoachDashboardResponse> {
  const supabase = getSupabaseAdminClient();
  const room = await ensureCoachBootstrapped(user);

  const [
    profileResponse,
    coachResponse,
    clientsResponse,
    programsResponse,
    ordersResponse,
    productsResponse,
    subscriptionsResponse,
    joinRequestsResponse
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").eq("id", user.id).single(),
    supabase.from("coaches").select("brand_name").eq("id", user.id).single(),
    supabase.from("clients").select("id, status, current_weight, created_at").eq("coach_id", user.id).order("created_at", { ascending: false }),
    supabase.from("programs").select("id, created_at, title").eq("coach_id", user.id),
    supabase.from("orders").select("id, product_id, total, status, created_at").eq("coach_id", user.id),
    supabase.from("store_products").select("id, title, description, price, type, asset_url, active").eq("coach_id", user.id).eq("active", true),
    supabase.from("subscriptions").select("client_id, status, current_period_end").eq("coach_id", user.id),
    supabase.from("room_join_requests").select("id, client_email, status, created_at").eq("coach_id", user.id).order("created_at", { ascending: false })
  ]);

  const clients = clientsResponse.data || [];
  const clientIds = clients.map((client) => client.id);
  const joinRequests = joinRequestsResponse.data || [];

  const [clientProfilesResponse, onboardingResponse] = await Promise.all([
    clientIds.length
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    joinRequests.length
      ? supabase
          .from("onboarding_surveys")
          .select("room_join_request_id, age, weight")
          .in(
            "room_join_request_id",
            joinRequests.map((request) => request.id)
          )
      : Promise.resolve({ data: [], error: null })
  ]);

  const clientProfiles = new Map((clientProfilesResponse.data || []).map((profile) => [profile.id, profile]));
  const subscriptions = new Map((subscriptionsResponse.data || []).map((item) => [item.client_id, item]));
  const joinRequestsByEmail = new Map(joinRequests.filter((item) => item.client_email).map((item) => [item.client_email!, item]));
  const surveysByJoinRequest = new Map((onboardingResponse.data || []).map((survey) => [survey.room_join_request_id, survey]));

  const authUserResults = await Promise.all(
    clientIds.map(async (clientId) => {
      const result = await supabase.auth.admin.getUserById(clientId);
      return [clientId, result.data.user || null] as const;
    })
  );

  const authUsers = new Map(authUserResults);

  const dashboardClients: CoachDashboardClient[] = clients.map((client) => {
    const profile = clientProfiles.get(client.id);
    const authUser = authUsers.get(client.id);
    const email = authUser?.email || null;
    const joinRequest = email ? joinRequestsByEmail.get(email) : null;
    const survey = joinRequest ? surveysByJoinRequest.get(joinRequest.id) : null;
    const subscription = subscriptions.get(client.id);
    const isActive = client.status === "active" && subscription?.status !== "canceled";
    const fullName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "Client";

    return {
      id: client.id,
      name: fullName,
      initials: getInitials(fullName),
      status: isActive ? "active" : "inactive",
      dateJoined: formatShortDate(client.created_at),
      expireDate: formatShortDate(subscription?.current_period_end || null),
      age: survey?.age ? String(survey.age) : "Not provided",
      weight: formatWeight(client.current_weight ?? survey?.weight ?? null),
      lastSeen: formatRelativeTime(authUser?.last_sign_in_at || null),
      profileCompleteness: getProfileCompleteness([
        Boolean(profile?.full_name),
        Boolean(survey?.age),
        Boolean(survey?.weight || client.current_weight),
        Boolean(subscription?.current_period_end),
        Boolean(authUser?.last_sign_in_at)
      ]),
      email
    };
  });

  const allOrders = ordersResponse.data || [];
  const paidOrders = allOrders.filter((order) => order.status !== "pending");
  const productMap = new Map((productsResponse.data || []).map((product) => [product.id, product]));
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const monthlyRevenue = paidOrders
    .filter((order) => new Date(order.created_at).getTime() >= startOfMonth)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const revenueByType = new Map<string, number>([
    ["Programs", 0],
    ["E-books", 0],
    ["Merch", 0]
  ]);

  for (const order of paidOrders) {
    const product = order.product_id ? productMap.get(order.product_id) : null;
    const label =
      product?.type === "program" ? "Programs" : product?.type === "ebook" ? "E-books" : product?.type === "merch" ? "Merch" : "Programs";
    revenueByType.set(label, (revenueByType.get(label) || 0) + Number(order.total || 0));
  }

  const revenueBreakdown = Array.from(revenueByType.entries()).map(([label, value]) => ({
    label,
    value,
    share: monthlyRevenue > 0 ? Number(((value / monthlyRevenue) * 100).toFixed(1)) : 0
  }));

  const activeMembers = dashboardClients.filter((client) => client.status === "active").length;
  const clientOverviewTrend = buildClientOverviewTrend(clients.map((client) => client.created_at));
  const averageActiveMembers = clientOverviewTrend.length
    ? Math.round(clientOverviewTrend.reduce((sum, value) => sum + value, 0) / clientOverviewTrend.length)
    : 0;
  const maxActiveMembers = clientOverviewTrend.length ? Math.max(...clientOverviewTrend) : 0;

  const programs = programsResponse.data || [];
  const plansMonth = programs.filter((item) => new Date(item.created_at).getTime() >= startOfMonth).length;
  const plansWeek = programs.filter((item) => new Date(item.created_at).getTime() >= startOfWeek.getTime()).length;
  const plansToday = programs.filter((item) => new Date(item.created_at).getTime() >= startOfToday.getTime()).length;

  const monthlyBuckets = new Map<string, number>();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    monthlyBuckets.set(getMonthBucketKey(date), 0);
  }

  for (const order of paidOrders) {
    const bucket = getMonthBucketKey(new Date(order.created_at));
    if (monthlyBuckets.has(bucket)) {
      monthlyBuckets.set(bucket, (monthlyBuckets.get(bucket) || 0) + Number(order.total || 0));
    }
  }

  const dashboardStore: CoachDashboardStoreItem[] = (productsResponse.data || []).map((product) => ({
    id: product.id,
    title: product.title,
    subtitle: product.description,
    priceLabel: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(product.price)),
    type: product.type,
    image: product.asset_url || null
  }));

  const profile = profileResponse.data;
  const coach = coachResponse.data;
  const name = profile?.full_name || fallbackCoachName(user);
  const avatar = await resolveStorageAssetUrl(
    supabase,
    "coach-branding",
    profile?.avatar_url || (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null)
  );

  return {
    profile: {
      id: user.id,
      name,
      handle: user.email ? toHandle(user.email.split("@")[0]) : toHandle(name),
      role: coach?.brand_name || "Coach",
      avatar,
      brandName: coach?.brand_name || `${name} Coaching`,
      roomId: room.room_id,
      roomName: room.room_name
    },
    metrics: {
      monthlyRevenue,
      paidOrderRate: allOrders.length ? Math.round((paidOrders.length / allOrders.length) * 100) : 0,
      revenueBreakdown,
      clientOverviewTrend,
      activeMembers,
      averageActiveMembers,
      maxActiveMembers,
      plansMonth,
      plansWeek,
      plansToday,
      pendingJoins: joinRequests.filter((item) => item.status === "pending").length
    },
    clients: dashboardClients,
    store: dashboardStore
  };
}
