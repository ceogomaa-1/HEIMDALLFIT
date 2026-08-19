"use client";

import { Bot, Send, Sparkles, WandSparkles, X } from "lucide-react";
import { useState } from "react";

export type CopilotMessage = { role: "user" | "assistant"; content: string };

const quickPrompts = [
  "Build a premium 4-day hypertrophy plan with sets, reps, rest, and coaching cues.",
  "Turn this into a clean two-page nutrition plan with macro targets and a meal table.",
  "Redesign this plan with stronger hierarchy, more whitespace, and a luxury editorial look.",
  "Create a detailed client onboarding questionnaire that is easy to complete on a phone."
];

export function BuilderCopilot({ open, generating, onClose, onGenerate }: { open: boolean; generating: boolean; onClose: () => void; onGenerate: (prompt: string, conversation: CopilotMessage[]) => Promise<string> }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([
    { role: "assistant", content: "Tell me what you’re building, who it’s for, and the outcome you want. I can create the full plan or redesign what’s already on your canvas." }
  ]);

  async function submit(value = prompt) {
    const request = value.trim();
    if (!request || generating) return;
    const next = [...messages, { role: "user" as const, content: request }];
    setMessages(next);
    setPrompt("");
    try {
      const reply = await onGenerate(request, next);
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "I couldn’t update the canvas. Try again." }]);
    }
  }

  return (
    <aside className={`builder-copilot ${open ? "builder-copilot-open" : ""}`} aria-hidden={!open}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Grok Studio</p><p className="text-[11px] text-white/38">AI plan designer</p></div></div>
        <button type="button" onClick={onClose} className="builder-icon-button" aria-label="Close Grok Studio"><X /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500/12 to-violet-500/8 p-4">
          <WandSparkles className="h-5 w-5 text-blue-300" />
          <p className="mt-3 text-sm font-semibold">Build with a sentence</p>
          <p className="mt-1 text-xs leading-5 text-white/45">Grok creates editable pages and layers. Nothing is flattened—you can still move, resize, and restyle everything.</p>
        </div>

        {messages.length === 1 ? <div className="mt-4 space-y-2">{quickPrompts.map((item) => <button key={item} type="button" onClick={() => void submit(item)} className="w-full rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-3 text-left text-xs leading-5 text-white/58 transition hover:bg-white/[0.07] hover:text-white">{item}</button>)}</div> : null}

        <div className="mt-5 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" ? <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-blue-300"><Bot className="h-3.5 w-3.5" /></span> : null}
              <p className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${message.role === "user" ? "bg-blue-600 text-white" : "bg-white/[0.055] text-white/68"}`}>{message.content}</p>
            </div>
          ))}
          {generating ? <div className="flex items-center gap-2 text-xs text-white/42"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.07]"><Sparkles className="h-3.5 w-3.5 animate-pulse text-blue-300" /></span>Designing your editable plan…</div> : null}
        </div>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="shrink-0 border-t border-white/[0.07] p-3">
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.05] p-2 focus-within:border-blue-400/40">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Build a plan, change the layout…" rows={3} className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-5 text-white outline-none placeholder:text-white/28" />
          <div className="flex items-center justify-between px-1 pb-1"><span className="text-[10px] text-white/25">Shift + Enter for a new line</span><button type="submit" disabled={!prompt.trim() || generating} className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-35"><Send className="h-4 w-4" /></button></div>
        </div>
        <p className="mt-2 text-center text-[10px] leading-4 text-white/25">Review AI-generated fitness and nutrition guidance before sending.</p>
      </form>
    </aside>
  );
}
