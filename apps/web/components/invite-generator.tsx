"use client";

import { appConfig } from "@heimdallfit/config";
import { useState } from "react";

export function InviteGenerator({ coachId }: { coachId: string }) {
  const [payload, setPayload] = useState("Maya Chen,+14165551212\nJordan Silva,jordan@example.com");
  const [result, setResult] = useState<string>("");

  async function generateInvites() {
    const contacts = payload
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, emailOrPhone] = line.split(",");
        const isEmail = emailOrPhone.includes("@");
        return {
          firstName: name,
          email: isEmail ? emailOrPhone : undefined,
          phone: isEmail ? undefined : emailOrPhone
        };
      });

    const response = await fetch("/api/migration-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachId, contacts })
    });
    const data = await response.json();
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <div className="glass rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300">One-Click Migration</p>
          <h3 className="mt-2 text-2xl font-semibold">Import clients and generate branded deep links</h3>
        </div>
        <div className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs text-sky-100">
          {appConfig.deepLinkBase}/{coachId}
        </div>
      </div>
      <textarea
        className="mt-4 h-40 w-full rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none"
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-white/55">One contact per line: `Name,email` or `Name,phone`.</p>
        <button
          className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-black shadow-glow transition hover:opacity-90"
          onClick={generateInvites}
        >
          Generate Invites
        </button>
      </div>
      {result ? (
        <pre className="mt-4 overflow-auto rounded-3xl border border-white/10 bg-black/20 p-4 text-xs text-sky-100">{result}</pre>
      ) : null}
    </div>
  );
}
