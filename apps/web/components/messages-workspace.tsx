"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, CheckCheck, FileText, Loader2, MessageCircleMore, Paperclip, Search, SendHorizontal, ShieldCheck, X } from "lucide-react";
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

function ThreadListSkeleton() {
  return (
    <div className="divide-y divide-white/[0.055]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-4">
          <div className="skeleton h-[52px] w-[52px] rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadViewportSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between px-4 py-6 sm:px-8">
      <div />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}>
            <div className="skeleton h-14 w-[min(72%,260px)] rounded-[20px]" />
          </div>
        ))}
      </div>
      <div />
    </div>
  );
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
      setSelectedId((current) => current || (window.matchMedia("(min-width: 768px)").matches ? nextThreads[0]?.id || null : null));
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
    const latestMessage = payload.messages.at(-1);
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

  const unreadCount = threads.filter((thread) => thread.unread).length;

  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-1 overflow-hidden bg-[#0c0d10] md:grid-cols-[340px_minmax(0,1fr)] md:border md:border-white/[0.06] lg:rounded-[24px] xl:grid-cols-[370px_minmax(0,1fr)]">
      <aside className={cn("min-h-0 flex-col border-r border-white/[0.06] bg-[#101115]", selectedId ? "hidden md:flex" : "flex")}>
        <div className="shrink-0 border-b border-white/[0.055] px-4 pb-4 pt-5 sm:px-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.035em] text-white">Chats</h2>
              <p className="mt-0.5 text-[13px] text-white/42">{threads.length} {threads.length === 1 ? "conversation" : "conversations"}</p>
            </div>
            {unreadCount ? <span className="mb-1 rounded-full bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white">{unreadCount} new</span> : null}
          </div>
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/34" />
            <input
              value={threadQuery}
              onChange={(event) => setThreadQuery(event.target.value)}
              placeholder="Search messages"
              aria-label="Search messages"
              className="h-11 w-full rounded-[14px] border border-white/[0.065] bg-white/[0.045] pl-10 pr-4 text-[16px] text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/40 focus:bg-white/[0.065] sm:text-sm"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loadingThreads ? (
            <ThreadListSkeleton />
          ) : filteredThreads.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.055] text-white/40"><MessageCircleMore className="h-6 w-6" /></span>
              <h3 className="mt-5 text-[17px] font-semibold text-white">{threadQuery ? "No matching chats" : emptyTitle}</h3>
              <p className="mt-2 max-w-[260px] text-[13px] leading-6 text-white/45">{threadQuery ? "Try a different name or keyword." : emptyCopy}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className={cn(
                    "relative flex min-h-[78px] w-full touch-manipulation items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5",
                    selectedId === thread.id ? "bg-white/[0.07]" : "hover:bg-white/[0.035] active:bg-white/[0.06]"
                  )}
                >
                  <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#253354,#172b2b)] text-[15px] font-semibold text-white">
                    {thread.counterpartAvatar ? <img src={thread.counterpartAvatar} alt={thread.counterpartName} className="h-full w-full object-cover" /> : initials(thread.counterpartName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={cn("truncate text-[15px] tracking-[-0.015em]", thread.unread ? "font-semibold text-white" : "font-medium text-white/88")}>{thread.counterpartName}</p>
                      <span className={cn("max-w-[92px] shrink-0 truncate text-[11px]", thread.unread ? "font-medium text-blue-400" : "text-white/35")}>{thread.lastMessageAt || "Now"}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={cn("min-w-0 flex-1 truncate text-[13px]", thread.unread ? "font-medium text-white/78" : "text-white/43")}>{thread.lastMessagePreview}</p>
                      {thread.unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" aria-label="Unread" /> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className={cn("min-h-0 flex-col bg-[#0c0d10]", selectedId ? "flex" : "hidden md:flex")}>
        {!selectedThread ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] text-white/36"><MessageCircleMore className="h-7 w-7" /></span>
            <p className="mt-5 text-[17px] font-semibold text-white">Choose a conversation</p>
            <p className="mt-2 text-sm text-white/40">Your private coaching messages will appear here.</p>
          </div>
        ) : loadingMessages && !threadPayload ? (
          <ThreadViewportSkeleton />
        ) : threadPayload ? (
          <>
            <header className="flex h-[66px] shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#101115]/95 px-3 backdrop-blur-xl sm:px-5">
              <button type="button" aria-label="Back to chats" onClick={() => setSelectedId(null)} className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-white/75 transition active:bg-white/[0.08] md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#253354,#172b2b)] text-sm font-semibold text-white">
                {selectedThread.counterpartAvatar ? <img src={selectedThread.counterpartAvatar} alt={threadPayload.thread.counterpartName} className="h-full w-full object-cover" /> : initials(threadPayload.thread.counterpartName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold tracking-[-0.025em] text-white">{threadPayload.thread.counterpartName}</p>
                <p className={cn("mt-0.5 truncate text-[12px]", typingLabel ? "text-emerald-400" : "text-white/38")}>{typingLabel || threadPayload.thread.lastSeenLabel}</p>
              </div>
              <div className="hidden items-center gap-1.5 text-[11px] text-white/34 sm:flex"><ShieldCheck className="h-3.5 w-3.5" /> Private</div>
            </header>

            <div ref={threadViewportRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-7 sm:py-7 lg:px-10">
              <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col justify-end">
                {portal === "client" && (threadPayload.onboarding.status === "pending" || threadPayload.onboarding.status === "submitted") ? (
                  <details className="group mb-6 overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.035]">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400"><ShieldCheck className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white">Your onboarding details</span><span className="mt-0.5 block truncate text-xs text-white/42">{threadPayload.onboarding.status === "submitted" ? "Submitted — tap to review or update" : "Your coach is waiting for these details"}</span></span>
                      <span className="text-xs font-medium text-blue-400">Open</span>
                    </summary>
                    <div className="border-t border-white/[0.06] px-4 pb-4 pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input value={onboardingDraft.age} onChange={(event) => setOnboardingDraft((current) => ({ ...current, age: event.target.value }))} placeholder="Age" aria-label="Age" className="h-11 rounded-[13px] border border-white/[0.08] bg-black/20 px-3 text-[16px] text-white outline-none focus:border-blue-400/45 sm:text-sm" />
                        <input value={onboardingDraft.weight} onChange={(event) => setOnboardingDraft((current) => ({ ...current, weight: event.target.value }))} placeholder="Current weight" aria-label="Current weight" className="h-11 rounded-[13px] border border-white/[0.08] bg-black/20 px-3 text-[16px] text-white outline-none focus:border-blue-400/45 sm:text-sm" />
                        <textarea value={onboardingDraft.injuries} onChange={(event) => setOnboardingDraft((current) => ({ ...current, injuries: event.target.value }))} placeholder="Injuries or limitations" aria-label="Injuries or limitations" className="min-h-[86px] rounded-[13px] border border-white/[0.08] bg-black/20 px-3 py-3 text-[16px] text-white outline-none focus:border-blue-400/45 sm:col-span-2 sm:text-sm" />
                        <textarea value={onboardingDraft.goals} onChange={(event) => setOnboardingDraft((current) => ({ ...current, goals: event.target.value }))} placeholder="Goals" aria-label="Goals" className="min-h-[86px] rounded-[13px] border border-white/[0.08] bg-black/20 px-3 py-3 text-[16px] text-white outline-none focus:border-blue-400/45 sm:col-span-2 sm:text-sm" />
                      </div>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-white/40">{threadPayload.onboarding.submittedAt ? `Last sent ${threadPayload.onboarding.submittedAt}` : "Only your coach can see this."}</p>
                        <button type="button" onClick={handleOnboardingSubmit} disabled={submittingOnboarding} className="min-h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-55">
                          {submittingOnboarding ? "Sending..." : threadPayload.onboarding.status === "submitted" ? "Update details" : "Send to coach"}
                        </button>
                      </div>
                    </div>
                  </details>
                ) : null}

                <div className="space-y-1">
                  {threadPayload.messages.map((message, index) => {
                    const previous = threadPayload.messages[index - 1];
                    const next = threadPayload.messages[index + 1];
                    const sameAsPrevious = Boolean(previous && previous.mine === message.mine);
                    const sameAsNext = Boolean(next && next.mine === message.mine);
                    const showIncomingAvatar = !message.mine && !sameAsNext;
                    const isLastMine = message.mine && !threadPayload.messages.slice(index + 1).some((item) => item.mine);

                    return (
                      <div key={message.id} className={cn("flex items-end gap-2", message.mine ? "justify-end" : "justify-start", !sameAsPrevious && index > 0 && "pt-3")}>
                        {!message.mine ? (
                          showIncomingAvatar ? (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-[9px] font-semibold text-white/80">
                              {selectedThread.counterpartAvatar ? <img src={selectedThread.counterpartAvatar} alt="" className="h-full w-full object-cover" /> : initials(threadPayload.thread.counterpartName)}
                            </div>
                          ) : <span className="w-7 shrink-0" />
                        ) : null}
                        <div className={cn("flex max-w-[82%] flex-col sm:max-w-[72%] lg:max-w-[66%]", message.mine ? "items-end" : "items-start")}>
                          <div className={cn(
                            "overflow-hidden px-3.5 py-2.5 text-[15px] leading-[1.42] shadow-sm",
                            message.mine ? "bg-blue-600 text-white" : "bg-[#202126] text-white/90",
                            message.mine
                              ? cn("rounded-[20px]", sameAsPrevious && "rounded-tr-[7px]", sameAsNext && "rounded-br-[7px]")
                              : cn("rounded-[20px]", sameAsPrevious && "rounded-tl-[7px]", sameAsNext && "rounded-bl-[7px]")
                          )}>
                            {message.attachments.length ? (
                              <div className={cn("space-y-2", message.body && "mb-2")}>
                                {message.attachments.map((attachment) => isImage(attachment) && attachment.url ? (
                                  <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.fileName} className="max-h-[320px] w-full rounded-[14px] object-cover" /></a>
                                ) : (
                                  <a key={attachment.id} href={attachment.url || "#"} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-3 rounded-[13px] bg-black/15 px-3 py-2.5 text-sm">
                                    <FileText className="h-5 w-5 shrink-0 opacity-70" /><span className="min-w-0 truncate">{attachment.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            ) : null}
                            {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                          </div>
                          {!sameAsNext ? (
                            <div className={cn("mt-1 flex items-center gap-1.5 px-1 text-[10px] text-white/32", message.mine && "justify-end")}>
                              <span>{message.createdAt}</span>
                              {isLastMine ? <CheckCheck className="h-3 w-3 text-blue-400" aria-label={threadPayload.thread.lastSeenLabel} /> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/[0.06] bg-[#101115] px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-5 sm:pb-4 sm:pt-3">
              <div className="mx-auto max-w-[900px]">
                {error ? <div className="mb-2 rounded-[13px] bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">{error}</div> : null}
                {attachments.length ? (
                  <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                    {attachments.map((file, index) => (
                      <span key={`${file.name}-${file.size}`} className="flex max-w-[220px] shrink-0 items-center gap-2 rounded-full bg-white/[0.07] py-1.5 pl-3 pr-1.5 text-xs text-white/70">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{file.name}</span>
                        <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.08] hover:text-white"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-end gap-2">
                  <label className="flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.06] hover:text-white active:bg-white/[0.1]">
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Attach files</span>
                    <input type="file" multiple className="hidden" onChange={(event) => setAttachments(Array.from(event.target.files || []))} />
                  </label>
                  <div className="flex min-h-11 flex-1 items-end rounded-[22px] bg-white/[0.065] px-4 py-[11px] ring-1 ring-inset ring-white/[0.055] focus-within:ring-blue-400/35">
                    <textarea
                      value={messageBody}
                      rows={1}
                      onChange={(event) => {
                        setMessageBody(event.target.value);
                        event.currentTarget.style.height = "auto";
                        event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 112)}px`;
                        void broadcastTyping();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Message"
                      aria-label="Message"
                      className="max-h-28 min-h-[22px] w-full resize-none overflow-y-auto bg-transparent text-[16px] leading-[22px] text-white outline-none placeholder:text-white/30"
                    />
                  </div>
                  <button type="button" aria-label="Send message" onClick={handleSendMessage} disabled={sending || (!messageBody.trim() && attachments.length === 0)} className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-blue-600 text-white transition active:scale-95 disabled:bg-white/[0.06] disabled:text-white/25">
                    {sending ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <SendHorizontal className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
}
