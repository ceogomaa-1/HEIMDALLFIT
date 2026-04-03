import type { User } from "@supabase/supabase-js";
import { ensureClientProfile, ensureCoachBootstrapped } from "./coach-dashboard-server";
import { getSupabaseAdminClient } from "./supabase-admin";
import { resolveStorageAssetUrl } from "./storage";

export type PortalRole = "coach" | "client";

export type ThreadSummary = {
  id: string;
  counterpartName: string;
  counterpartHandle: string;
  counterpartRole: string;
  counterpartAvatar: string | null;
  status: string;
  roomName: string;
  roomId: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unread: boolean;
};

export type ThreadAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  path: string;
  url: string | null;
};

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderProfileId: string;
  senderName: string;
  senderRole: PortalRole;
  mine: boolean;
  attachments: ThreadAttachment[];
};

export type ThreadOnboarding = {
  status: "not_requested" | "pending" | "submitted";
  requestId: string | null;
  submittedAt: string | null;
  age: string;
  weight: string;
  injuries: string;
  goals: string;
};

function fallbackName(user: User | null | undefined) {
  const metadataName =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";

  if (metadataName) return metadataName;
  if (user?.email) return user.email.split("@")[0].replace(/[._-]+/g, " ");
  return "Member";
}

function toHandle(value: string) {
  return `@${value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "member"}`;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getUnread(lastMessageAt: string | null, lastSenderProfileId: string | null, currentProfileId: string, lastSeenAt: string | null) {
  if (!lastMessageAt || !lastSenderProfileId || lastSenderProfileId === currentProfileId) {
    return false;
  }

  if (!lastSeenAt) return true;
  return new Date(lastMessageAt).getTime() > new Date(lastSeenAt).getTime();
}

async function getRole(userId: string): Promise<PortalRole> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data?.role === "coach" || data?.role === "client") return data.role;
  throw new Error("This account is not ready for messaging yet.");
}

async function getLatestJoinRequest(coachId: string, clientId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("room_join_requests")
    .select("id, status, created_at, accepted_at")
    .eq("coach_id", coachId)
    .eq("client_profile_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getOnboardingState(coachId: string, clientId: string): Promise<ThreadOnboarding> {
  const supabase = getSupabaseAdminClient();
  const joinRequest = await getLatestJoinRequest(coachId, clientId);

  if (!joinRequest) {
    return {
      status: "not_requested",
      requestId: null,
      submittedAt: null,
      age: "",
      weight: "",
      injuries: "",
      goals: ""
    };
  }

  const { data: survey, error } = await supabase
    .from("onboarding_surveys")
    .select("created_at, age, weight, injuries, goals")
    .eq("room_join_request_id", joinRequest.id)
    .maybeSingle();

  if (error) throw error;

  if (!survey) {
    return {
      status: "pending",
      requestId: joinRequest.id,
      submittedAt: null,
      age: "",
      weight: "",
      injuries: "",
      goals: ""
    };
  }

  return {
    status: "submitted",
    requestId: joinRequest.id,
    submittedAt: formatTimestamp(survey.created_at),
    age: String(survey.age ?? ""),
    weight: String(survey.weight ?? ""),
    injuries: survey.injuries || "",
    goals: survey.goals || ""
  };
}

async function buildAttachmentMap(messageIds: string[]) {
  const supabase = getSupabaseAdminClient();
  if (!messageIds.length) return new Map<string, ThreadAttachment[]>();

  const { data, error } = await supabase
    .from("message_attachments")
    .select("id, message_id, file_name, mime_type, size_bytes, storage_path")
    .in("message_id", messageIds);

  if (error) throw error;

  const mapped = await Promise.all(
    (data || []).map(async (attachment) => ({
      messageId: attachment.message_id,
      attachment: {
        id: attachment.id,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
        path: attachment.storage_path,
        url: await resolveStorageAssetUrl(supabase, "message-attachments", attachment.storage_path)
      } satisfies ThreadAttachment
    }))
  );

  const grouped = new Map<string, ThreadAttachment[]>();
  for (const item of mapped) {
    grouped.set(item.messageId, [...(grouped.get(item.messageId) || []), item.attachment]);
  }

  return grouped;
}

export async function ensureConversationForPair(coachId: string, clientId: string, roomId: string | null) {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("conversations")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      room_id: roomId,
      last_message_preview: "Room connected. Messaging now lives here inside HEIMDALLFIT.",
      last_message_at: now
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("conversations")
      .select("id")
      .eq("coach_id", coachId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (fallbackError || !fallback?.id) {
      throw insertError || fallbackError || new Error("Unable to create conversation.");
    }

    return fallback.id;
  }

  return inserted.id;
}

async function ensureWelcomeMessage(conversationId: string) {
  const supabase = getSupabaseAdminClient();
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (countError) throw countError;
  if ((count || 0) > 0) return;

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("coach_id")
    .eq("id", conversationId)
    .single();

  if (conversationError) throw conversationError;

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: conversation.coach_id,
    body: "Welcome to your HEIMDALLFIT thread. This is now your private coach-client channel."
  });
}

async function buildCoachThreads(user: User) {
  const supabase = getSupabaseAdminClient();
  await ensureCoachBootstrapped(user);

  const [{ data: clients }, { data: rooms }, { data: conversations }] = await Promise.all([
    supabase.from("clients").select("id, status, room_id").eq("coach_id", user.id).order("created_at", { ascending: false }),
    supabase.from("rooms").select("id, room_id, room_name").eq("coach_id", user.id),
    supabase
      .from("conversations")
      .select("id, client_id, room_id, last_message_preview, last_message_at, last_sender_profile_id, coach_last_seen_at")
      .eq("coach_id", user.id)
  ]);

  const roomMap = new Map((rooms || []).map((room) => [room.id, room]));
  const conversationMap = new Map((conversations || []).map((conversation) => [conversation.client_id, conversation]));

  for (const client of clients || []) {
    if (!conversationMap.has(client.id)) {
      const conversationId = await ensureConversationForPair(user.id, client.id, client.room_id);
      await ensureWelcomeMessage(conversationId);
    }
  }

  const [{ data: freshConversations }, { data: profiles }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, client_id, room_id, last_message_preview, last_message_at, last_sender_profile_id, coach_last_seen_at")
      .eq("coach_id", user.id)
      .order("last_message_at", { ascending: false }),
    clients?.length
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", clients.map((client) => client.id))
      : Promise.resolve({ data: [], error: null })
  ]);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const authUsers = new Map(
    await Promise.all(
      (clients || []).map(async (client) => {
        const response = await supabase.auth.admin.getUserById(client.id);
        return [client.id, response.data.user || null] as const;
      })
    )
  );
  const clientMap = new Map((clients || []).map((client) => [client.id, client]));

  const threads = await Promise.all(
    (freshConversations || []).map(async (conversation) => {
      const client = clientMap.get(conversation.client_id);
      const profile = profileMap.get(conversation.client_id);
      const authUser = authUsers.get(conversation.client_id);
      const name = profile?.full_name || fallbackName(authUser);
      const avatar = await resolveStorageAssetUrl(supabase, "coach-branding", profile?.avatar_url || null);
      const room = conversation.room_id ? roomMap.get(conversation.room_id) : null;

      return {
        id: conversation.id,
        counterpartName: name,
        counterpartHandle: authUser?.email ? toHandle(authUser.email.split("@")[0]) : "@client",
        counterpartRole: "Client",
        counterpartAvatar: avatar,
        status: client?.status || "pending",
        roomName: room?.room_name || "No room name yet",
        roomId: room?.room_id || null,
        lastMessagePreview: conversation.last_message_preview || "No messages yet.",
        lastMessageAt: formatTimestamp(conversation.last_message_at),
        unread: getUnread(conversation.last_message_at, conversation.last_sender_profile_id, user.id, conversation.coach_last_seen_at)
      } satisfies ThreadSummary;
    })
  );

  return threads;
}

async function buildClientThreads(user: User) {
  const supabase = getSupabaseAdminClient();
  await ensureClientProfile(user);

  const { data: client } = await supabase.from("clients").select("coach_id, room_id, status").eq("id", user.id).maybeSingle();
  if (!client?.coach_id) return [] as ThreadSummary[];

  const conversationId = await ensureConversationForPair(client.coach_id, user.id, client.room_id);
  await ensureWelcomeMessage(conversationId);

  const [{ data: conversation }, { data: coach }, { data: coachProfile }, { data: room }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, last_message_preview, last_message_at, last_sender_profile_id, client_last_seen_at")
      .eq("id", conversationId)
      .single(),
    supabase.from("coaches").select("brand_name").eq("id", client.coach_id).maybeSingle(),
    supabase.from("profiles").select("full_name, avatar_url").eq("id", client.coach_id).maybeSingle(),
    client.room_id
      ? supabase.from("rooms").select("room_id, room_name").eq("id", client.room_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  const coachAvatar = await resolveStorageAssetUrl(supabase, "coach-branding", coachProfile?.avatar_url || null);
  const coachName = coach?.brand_name || coachProfile?.full_name || "Coach";

  if (!conversation) {
    return [] as ThreadSummary[];
  }

  return [
    {
      id: conversation.id,
      counterpartName: coachName,
      counterpartHandle: coachProfile?.full_name ? toHandle(coachProfile.full_name) : "@coach",
      counterpartRole: "Coach",
      counterpartAvatar: coachAvatar,
      status: client.status,
      roomName: room?.room_name || "Coach Room",
      roomId: room?.room_id || null,
      lastMessagePreview: conversation.last_message_preview || "No messages yet.",
      lastMessageAt: formatTimestamp(conversation.last_message_at),
      unread: getUnread(conversation.last_message_at, conversation.last_sender_profile_id, user.id, conversation.client_last_seen_at)
    }
  ];
}

export async function getThreadsForUser(user: User) {
  const role = await getRole(user.id);
  if (role === "coach") {
    return { role, threads: await buildCoachThreads(user) };
  }

  return { role, threads: await buildClientThreads(user) };
}

export async function getThreadMessagesForUser(user: User, conversationId: string) {
  const supabase = getSupabaseAdminClient();
  const role = await getRole(user.id);

  if (role === "coach") {
    await ensureCoachBootstrapped(user);
  } else {
    await ensureClientProfile(user);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, coach_id, client_id, room_id, coach_last_seen_at, client_last_seen_at, last_message_at, last_sender_profile_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation || (conversation.coach_id !== user.id && conversation.client_id !== user.id)) {
    throw new Error("Conversation not found for this account.");
  }

  await ensureWelcomeMessage(conversationId);

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_profile_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  const messageIds = (messages || []).map((message) => message.id);
  const attachmentMap = await buildAttachmentMap(messageIds);

  const senderIds = Array.from(new Set((messages || []).map((message) => message.sender_profile_id)));
  const [{ data: profiles }, { data: coach }, { data: client }, { data: room }, onboarding] = await Promise.all([
    senderIds.length
      ? supabase.from("profiles").select("id, role, full_name").in("id", senderIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("profiles").select("full_name").eq("id", conversation.coach_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", conversation.client_id).maybeSingle(),
    conversation.room_id
      ? supabase.from("rooms").select("room_id, room_name").eq("id", conversation.room_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getOnboardingState(conversation.coach_id, conversation.client_id)
  ]);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const counterpartName = role === "coach" ? client?.full_name || "Client" : coach?.full_name || "Coach";

  return {
    role,
    thread: {
      id: conversation.id,
      roomId: room?.room_id || null,
      roomName: room?.room_name || "Coach Room",
      counterpartName,
      lastSeenAt:
        role === "coach" ? formatTimestamp(conversation.client_last_seen_at) : formatTimestamp(conversation.coach_last_seen_at),
      lastSeenLabel:
        role === "coach"
          ? conversation.client_last_seen_at
            ? `Seen ${formatTimestamp(conversation.client_last_seen_at)}`
            : "Not seen yet"
          : conversation.coach_last_seen_at
            ? `Seen ${formatTimestamp(conversation.coach_last_seen_at)}`
            : "Not seen yet"
    },
    onboarding,
    messages: (messages || []).map((message) => {
      const sender = profileMap.get(message.sender_profile_id);
      return {
        id: message.id,
        body: message.body,
        createdAt: formatTimestamp(message.created_at) || "Now",
        senderProfileId: message.sender_profile_id,
        senderName: sender?.full_name || "Member",
        senderRole: sender?.role === "coach" ? "coach" : "client",
        mine: message.sender_profile_id === user.id,
        attachments: attachmentMap.get(message.id) || []
      } satisfies ThreadMessage;
    })
  };
}

async function storeMessageAttachments(messageId: string, files: File[]) {
  const supabase = getSupabaseAdminClient();
  const attachments: ThreadAttachment[] = [];

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${messageId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from("message-attachments").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await supabase
      .from("message_attachments")
      .insert({
        message_id: messageId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size
      })
      .select("id, file_name, mime_type, size_bytes, storage_path")
      .single();

    if (insertError || !inserted) throw insertError || new Error("Unable to attach file.");

    attachments.push({
      id: inserted.id,
      fileName: inserted.file_name,
      mimeType: inserted.mime_type,
      sizeBytes: inserted.size_bytes,
      path: inserted.storage_path,
      url: await resolveStorageAssetUrl(supabase, "message-attachments", inserted.storage_path)
    });
  }

  return attachments;
}

export async function sendMessageForUser(user: User, conversationId: string, body: string, files: File[] = []) {
  const supabase = getSupabaseAdminClient();
  const role = await getRole(user.id);
  const trimmed = body.trim();

  if (!trimmed && !files.length) {
    throw new Error("Message cannot be empty.");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, coach_id, client_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation || (conversation.coach_id !== user.id && conversation.client_id !== user.id)) {
    throw new Error("Conversation not found for this account.");
  }

  const now = new Date().toISOString();
  const messageBody = trimmed || (files.length === 1 ? `Shared ${files[0].name}` : `Shared ${files.length} attachments`);

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_profile_id: user.id,
      body: messageBody
    })
    .select("id, body, created_at, sender_profile_id")
    .single();

  if (messageError || !message) {
    throw messageError || new Error("Unable to send message.");
  }

  const attachments = await storeMessageAttachments(message.id, files);

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      last_message_preview: messageBody.slice(0, 140),
      last_message_at: now,
      last_sender_profile_id: user.id,
      coach_last_seen_at: role === "coach" ? now : undefined,
      client_last_seen_at: role === "client" ? now : undefined
    })
    .eq("id", conversationId);

  if (updateError) {
    throw updateError;
  }

  return {
    id: message.id,
    body: message.body,
    createdAt: formatTimestamp(message.created_at) || "Now",
    senderProfileId: message.sender_profile_id,
    senderName: fallbackName(user),
    senderRole: role,
    mine: true,
    attachments
  } satisfies ThreadMessage;
}

export async function markThreadSeenForUser(user: User, conversationId: string) {
  const supabase = getSupabaseAdminClient();
  const role = await getRole(user.id);
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, coach_id, client_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation || (conversation.coach_id !== user.id && conversation.client_id !== user.id)) {
    throw new Error("Conversation not found for this account.");
  }

  const field = role === "coach" ? "coach_last_seen_at" : "client_last_seen_at";
  const { error } = await supabase.from("conversations").update({ [field]: new Date().toISOString() }).eq("id", conversationId);
  if (error) throw error;
}

export async function submitOnboardingForClient(user: User, conversationId: string, payload: { age: string; weight: string; injuries: string; goals: string }) {
  const supabase = getSupabaseAdminClient();
  const role = await getRole(user.id);
  if (role !== "client") {
    throw new Error("Only clients can submit onboarding.");
  }

  await ensureClientProfile(user);

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("coach_id, client_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation || conversation.client_id !== user.id) {
    throw new Error("Conversation not found for this account.");
  }

  const joinRequest = await getLatestJoinRequest(conversation.coach_id, conversation.client_id);
  if (!joinRequest?.id) {
    throw new Error("No onboarding request exists for this client yet.");
  }

  const age = Number.parseInt(payload.age, 10);
  const weight = Number.parseFloat(payload.weight);

  if (!Number.isFinite(age) || age <= 0) {
    throw new Error("Enter a valid age.");
  }

  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error("Enter a valid weight.");
  }

  const { error: upsertError } = await supabase.from("onboarding_surveys").upsert(
    {
      room_join_request_id: joinRequest.id,
      age,
      weight,
      injuries: payload.injuries.trim(),
      goals: payload.goals.trim()
    },
    { onConflict: "room_join_request_id" }
  );

  if (upsertError) throw upsertError;

  return getOnboardingState(conversation.coach_id, conversation.client_id);
}
