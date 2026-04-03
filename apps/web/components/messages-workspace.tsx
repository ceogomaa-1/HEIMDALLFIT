"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronDown, ImagePlus, Loader2, Paperclip, Plus, Search, SendHorizontal, ShieldCheck, Smile } from "lucide-react";
import { MorphingSquare } from "./ui/morphing-square";
import { cn } from "../lib/utils";

type PortalRole = "coach" | "client";

type ThreadSummary = {
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

type ThreadAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  path: string;
  url: string | null;
};

type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderProfileId: string;
  senderName: string;
  senderRole: PortalRole;
  mine: boolean;
  attachments: ThreadAttachment[];
};

type ThreadOnboarding = {
  status: "not_requested" | "pending" | "submitted";
  requestId: string | null;
  submittedAt: string | null;
  age: string;
  weight: string;
  injuries: string;
  goals: string;
};

type ThreadPayload = {
  role: PortalRole;
  thread: {
    id: string;
    roomId: string | null;
    roomName: string;
    counterpartName: string;
    lastSeenAt: string | null;
    lastSeenLabel: string;
  };
  onboarding: ThreadOnboarding;
  messages: ThreadMessage[];
};

type MessagesWorkspaceProps = {
  portal: PortalRole;
  supabase: SupabaseClient;
  emptyTitle: string;
  emptyCopy: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isImage(attachment: ThreadAttachment) {
  return attachment.mimeType.startsWith("image/");
}

export function MessagesWorkspace({ portal, supabase, emptyTitle, emptyCopy }: MessagesWorkspaceProps) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadPayload, setThreadPayload] = useState<ThreadPayload | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [typingLabel, setTypingLabel] = useState("");
  const [sending, setSending] = useState(false);
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadQuery, setThreadQuery] = useState("");
  const [onboardingDraft, setOnboardingDraft] = useState<ThreadOnboarding>({
    status: "not_requested",
    requestId: null,
    submittedAt: null,
    age: "",
    weight: "",
    injuries: "",
    goals: ""
  });
  const tokenRef = useRef<string | null>(null);
  const initializedThreadRef = useRef(false);
  const threadViewportRef = useRef<HTMLDivElement | null>(null);
  const previousMessageIdRef = useRef<string | null>(null);

  const selectedThread = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);
  const filteredThreads = useMemo(() => {
    const query = threadQuery.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => {
      const haystack = `${thread.counterpartName} ${thread.counterpartHandle} ${thread.roomName} ${thread.lastMessagePreview}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [threadQuery, threads]);
  const quickThreads = useMemo(() => filteredThreads.slice(0, 6), [filteredThreads]);

  async function getAccessToken() {
    if (tokenRef.current) return tokenRef.current;
    const {
      data: { session }
    } = await supabase.auth.getSession();
    tokenRef.current = session?.access_token || null;
    return tokenRef.current;
  }

  async function loadThreads(showLoader = true) {
    if (showLoader) setLoadingThreads(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please log in again.");

      const response = await fetch("/api/messages/threads", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load conversations.");

      const nextThreads = (payload.threads || []) as ThreadSummary[];
      setThreads(nextThreads);
      setSelectedId((current) => current || nextThreads[0]?.id || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversations.");
    } finally {
      if (showLoader) setLoadingThreads(false);
    }
  }

  async function loadMessages(threadId: string, showLoader = true, markSeen = true) {
    if (showLoader) setLoadingMessages(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please log in again.");

      const response = await fetch(`/api/messages/threads/${threadId}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load this thread.");

      const nextPayload = payload as ThreadPayload;
      setThreadPayload(nextPayload);
      setOnboardingDraft(nextPayload.onboarding);

      if (markSeen) {
        await fetch(`/api/messages/threads/${threadId}/seen`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` }
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this thread.");
    } finally {
      if (showLoader) setLoadingMessages(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token || null;
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token || null;
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    loadThreads(true);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setThreadPayload(null);
      return;
    }
    loadMessages(selectedId, !initializedThreadRef.current, true);
    initializedThreadRef.current = true;
  }, [selectedId]);

  useEffect(() => {
    if (!threadPayload) return;
    threadViewportRef.current?.scrollTo({ top: threadViewportRef.current.scrollHeight, behavior: "smooth" });
  }, [threadPayload]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const payload = threadPayload;
    if (!payload) return;
    const latestMessage = payload?.messages.at(-1);
    if (!latestMessage) return;

    if (!previousMessageIdRef.current) {
      previousMessageIdRef.current = latestMessage.id;
      return;
    }

    if (latestMessage.id === previousMessageIdRef.current) return;
    previousMessageIdRef.current = latestMessage.id;

    if (latestMessage.mine) return;
    if (typeof document === "undefined" || document.visibilityState === "visible") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    new Notification(payload.thread.counterpartName, {
      body: latestMessage.body || "Sent you an attachment in HEIMDALLFIT."
    });
  }, [threadPayload]);

  useEffect(() => {
    const threadsChannel = supabase
      .channel(`${portal}-threads-live`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        loadThreads(false);
        if (selectedId) loadMessages(selectedId, false, false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(threadsChannel);
    };
  }, [portal, selectedId, supabase]);

  useEffect(() => {
    if (!selectedId) return;

    const threadChannel = supabase
      .channel(`conversation-${selectedId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadMessages(selectedId, false, false);
        loadThreads(false);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const nextLabel = typeof payload?.label === "string" ? payload.label : "";
        setTypingLabel(nextLabel);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(threadChannel);
    };
  }, [portal, selectedId, supabase]);

  useEffect(() => {
    if (!typingLabel) return;
    const timeout = window.setTimeout(() => setTypingLabel(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [typingLabel]);

  async function broadcastTyping() {
    if (!selectedId) return;
    const channel = supabase.channel(`conversation-${selectedId}`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { label: portal === "coach" ? "Coach is typing..." : "Client is typing..." }
    });
    window.setTimeout(() => supabase.removeChannel(channel), 500);
  }

  async function handleSendMessage() {
    if (!selectedId || sending) return;
    if (!messageBody.trim() && attachments.length === 0) return;

    setSending(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please log in again.");

      const formData = new FormData();
      formData.append("body", messageBody);
      attachments.forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/messages/threads/${selectedId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to send message.");

      setMessageBody("");
      setAttachments([]);
      await loadMessages(selectedId, false);
      await loadThreads(false);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleOnboardingSubmit() {
    if (!selectedId || submittingOnboarding) return;
    setSubmittingOnboarding(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please log in again.");

      const response = await fetch(`/api/messages/threads/${selectedId}/onboarding`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(onboardingDraft)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to submit onboarding.");

      setOnboardingDraft(payload.onboarding as ThreadOnboarding);
      await loadMessages(selectedId, false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit onboarding.");
    } finally {
      setSubmittingOnboarding(false);
    }
  }

  return (
    <div className="grid min-h-[640px] grid-cols-[360px_minmax(0,1fr)] overflow-hidden rounded-[24px] border border-[#23242b] bg-[#14151b]">
      <aside className="flex min-h-0 flex-col border-r border-[#23242b] bg-[#17181f]">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
              <input
                value={threadQuery}
                onChange={(event) => setThreadQuery(event.target.value)}
                placeholder="Search"
                className="w-full rounded-[14px] border border-[#252730] bg-[#101117] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/28"
              />
            </div>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#252730] bg-[#101117] text-white/70">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {quickThreads.length ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {quickThreads.map((thread) => (
                <button key={`quick-${thread.id}`} type="button" onClick={() => setSelectedId(thread.id)} className="flex shrink-0 flex-col items-center gap-2">
                  <div className="relative">
                    <div className={cn("flex h-14 w-14 items-center justify-center rounded-full border-2 text-base font-semibold text-white", selectedId === thread.id ? "border-[#6b63ff]" : "border-[#2d2f39]", thread.counterpartAvatar ? "bg-[#111219]" : "bg-[#9446c6]")}>
                      {thread.counterpartAvatar ? <img src={thread.counterpartAvatar} alt={thread.counterpartName} className="h-full w-full rounded-full object-cover" /> : initials(thread.counterpartName)}
                    </div>
                    {thread.unread ? <span className="absolute -right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-[#17181f] bg-[#6b63ff]" /> : null}
                  </div>
                  <span className="max-w-[68px] truncate text-[11px] text-white/58">{thread.counterpartName}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {loadingThreads ? (
            <div className="flex h-full items-center justify-center"><MorphingSquare message="Loading threads..." /></div>
          ) : filteredThreads.length === 0 ? (
            <div className="rounded-[24px] border border-[#2f313b] bg-[#1b1c24] p-6">
              <h3 className="text-lg font-semibold text-white">{emptyTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{emptyCopy}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <p className="text-[13px] font-semibold text-white/92">Starred</p>
                <p className="text-[11px] text-white/36">{filteredThreads.filter((thread) => thread.unread).length} unread messages</p>
              </div>
              <div className="space-y-1">
                {filteredThreads.slice(0, Math.min(2, filteredThreads.length)).map((thread) => (
                  <button
                    key={`starred-${thread.id}`}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={cn("flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition", selectedId === thread.id ? "bg-[#20212a]" : "hover:bg-[#1d1e26]")}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2b2d36] text-sm font-semibold text-white">
                      {thread.counterpartAvatar ? <img src={thread.counterpartAvatar} alt={thread.counterpartName} className="h-full w-full rounded-full object-cover" /> : initials(thread.counterpartName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13px] font-medium text-white">{thread.counterpartName}</p>
                        <span className="shrink-0 text-[11px] text-white/45">{thread.lastMessageAt || "Now"}</span>
                      </div>
                      <p className="truncate text-[12px] text-white/55">{thread.lastMessagePreview}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between px-2 pb-2 pt-4">
                <p className="text-[13px] font-semibold text-white/92">Message</p>
                <p className="text-[11px] text-white/36">{filteredThreads.length} conversations</p>
              </div>

              <div className="space-y-1">
                {filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={cn("flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition", selectedId === thread.id ? "bg-[#20212a]" : "hover:bg-[#1d1e26]")}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2b2d36] text-sm font-semibold text-white">
                      {thread.counterpartAvatar ? <img src={thread.counterpartAvatar} alt={thread.counterpartName} className="h-full w-full rounded-full object-cover" /> : initials(thread.counterpartName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13px] font-medium text-white">{thread.counterpartName}</p>
                        <span className="shrink-0 text-[11px] text-white/42">{thread.lastMessageAt || "Now"}</span>
                      </div>
                      <p className="truncate text-[12px] text-white/55">{thread.lastMessagePreview}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-[radial-gradient(circle_at_top,_#111726_0%,_#12131a_40%,_#16171f_100%)]">
        {!selectedThread ? (
          <div className="flex h-full items-center justify-center"><MorphingSquare message="Choose a thread..." /></div>
        ) : loadingMessages && !threadPayload ? (
          <div className="flex h-full items-center justify-center"><MorphingSquare message="Loading thread..." /></div>
        ) : threadPayload ? (
          <>
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
              <div className="mx-auto flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#232530] text-xl font-semibold text-white shadow-[0_0_36px_rgba(107,99,255,0.16)]">
                  {selectedThread?.counterpartAvatar ? (
                    <img src={selectedThread.counterpartAvatar} alt={threadPayload.thread.counterpartName} className="h-full w-full object-cover" />
                  ) : (
                    initials(threadPayload.thread.counterpartName)
                  )}
                </div>
                <p className="mt-3 text-[20px] font-semibold text-white">{threadPayload.thread.counterpartName}</p>
                <p className="mt-1 text-sm text-white/52">{selectedThread?.counterpartHandle}</p>
                <p className="mt-3 text-xs text-white/42">{typingLabel || threadPayload.thread.lastSeenLabel}</p>
              </div>
              <button type="button" className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <div ref={threadViewportRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {portal === "client" && (threadPayload.onboarding.status === "pending" || threadPayload.onboarding.status === "submitted") ? (
                <div className="mx-auto max-w-2xl rounded-[20px] border border-[#31333e] bg-[#1a1b23] p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-[#45dd8e]" />
                    <div>
                      <p className="text-[15px] font-semibold text-white">Client onboarding form</p>
                      <p className="text-xs text-white/55">Send your core intake details back to your coach inside this thread.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input value={onboardingDraft.age} onChange={(event) => setOnboardingDraft((current) => ({ ...current, age: event.target.value }))} placeholder="Age" className="rounded-[16px] border border-[#343540] bg-[#12131a] px-3 py-2.5 text-sm text-white outline-none" />
                    <input value={onboardingDraft.weight} onChange={(event) => setOnboardingDraft((current) => ({ ...current, weight: event.target.value }))} placeholder="Weight" className="rounded-[16px] border border-[#343540] bg-[#12131a] px-3 py-2.5 text-sm text-white outline-none" />
                    <textarea value={onboardingDraft.injuries} onChange={(event) => setOnboardingDraft((current) => ({ ...current, injuries: event.target.value }))} placeholder="Injuries / limitations" className="min-h-[92px] rounded-[16px] border border-[#343540] bg-[#12131a] px-3 py-2.5 text-sm text-white outline-none md:col-span-2" />
                    <textarea value={onboardingDraft.goals} onChange={(event) => setOnboardingDraft((current) => ({ ...current, goals: event.target.value }))} placeholder="Goals" className="min-h-[92px] rounded-[16px] border border-[#343540] bg-[#12131a] px-3 py-2.5 text-sm text-white outline-none md:col-span-2" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-xs text-white/55">{threadPayload.onboarding.submittedAt ? `Last sent ${threadPayload.onboarding.submittedAt}` : "Not submitted yet."}</p>
                    <button type="button" onClick={handleOnboardingSubmit} disabled={submittingOnboarding} className="rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-60">
                      {submittingOnboarding ? "Sending..." : threadPayload.onboarding.status === "submitted" ? "Update onboarding" : "Submit onboarding"}
                    </button>
                  </div>
                </div>
              ) : null}

              {threadPayload.messages.map((message) => (
                <div key={message.id} className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[62%] rounded-[18px] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)]", message.mine ? "bg-[#6b63ff] text-white" : "border border-white/6 bg-[#1a1b22] text-white")}>
                    <p className="text-[10px] uppercase tracking-[0.18em] opacity-55">{message.senderName}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6">{message.body}</p>
                    {message.attachments.length ? (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((attachment) =>
                          isImage(attachment) && attachment.url ? (
                            <img key={attachment.id} src={attachment.url} alt={attachment.fileName} className="max-h-[220px] w-full rounded-[16px] object-cover" />
                          ) : (
                            <a key={attachment.id} href={attachment.url || "#"} target="_blank" rel="noreferrer" className={cn("flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-xs", message.mine ? "border-white/10 bg-white/10" : "border-white/10 bg-white/5")}>
                              <Paperclip className="h-3.5 w-3.5" />
                              <span className="truncate">{attachment.fileName}</span>
                            </a>
                          )
                        )}
                      </div>
                    ) : null}
                    <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] opacity-65">
                      <span>{message.createdAt}</span>
                      {message.mine ? <span>{threadPayload.thread.lastSeenLabel}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/6 px-5 py-4">
              {error ? <div className="mb-3 rounded-[16px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{error}</div> : null}
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="rounded-full border border-[#3b3d46] bg-[#1f2027] px-3 py-1.5 text-[11px] text-white/70">{file.name}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-[#111219] px-3 py-2.5">
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/68">
                  <Smile className="h-4 w-4" />
                </button>
                <textarea
                  value={messageBody}
                  onChange={(event) => {
                    setMessageBody(event.target.value);
                    void broadcastTyping();
                  }}
                  placeholder={portal === "coach" ? "Write a message..." : "Text message"}
                  className="max-h-28 min-h-[28px] flex-1 resize-none bg-transparent text-sm text-white outline-none"
                />
                <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/68">
                  <ImagePlus className="h-4 w-4" />
                  <input type="file" multiple className="hidden" onChange={(event) => setAttachments(Array.from(event.target.files || []))} />
                </label>
                <button type="button" onClick={handleSendMessage} disabled={sending} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6b63ff] text-white disabled:opacity-60">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
