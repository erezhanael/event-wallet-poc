"use client";

import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { EventBartender } from "@/lib/types";

export function BartenderManager({ eventId, initialBartenders }: { eventId: string; initialBartenders: EventBartender[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [bartenders, setBartenders] = useState(initialBartenders);
  const [message, setMessage] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function addBartender() {
    setTemporaryPassword(null);
    if (!email.trim()) {
      setMessage("Enter a bartender email.");
      return;
    }

    setIsSaving(true);
    setMessage("Adding bartender...");

    try {
      const response = await fetch(`/api/events/${eventId}/bartenders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not add bartender.");
        return;
      }

      setBartenders((current) => {
        const rest = current.filter((bartender) => bartender.user_id !== payload.member.user_id);
        return [payload.member, ...rest];
      });
      setEmail("");
      setTemporaryPassword(payload.temporaryPassword ?? null);
      setMessage(payload.createdUser ? "Bartender user created and assigned." : "Bartender assigned to this event.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function copyPassword() {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setMessage("Temporary password copied.");
  }

  return (
    <section className="glass-card p-5">
      <UserPlus className="text-emerald-200" />
      <h2 className="mt-4 text-lg font-black text-white">Add Bartenders</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-sm font-semibold text-white/70">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/60"
            placeholder="bartender@example.com"
          />
        </label>
        <button
          type="button"
          onClick={addBartender}
          disabled={isSaving}
          className="neon-button flex h-11 items-center justify-center gap-2 self-end px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus size={17} />
          Add
        </button>
      </div>
      {message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/60">{message}</p>}
      {temporaryPassword && (
        <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.10] p-3">
          <p className="text-sm font-bold text-amber-100">Temporary password</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-black/35 px-2 py-2 text-sm text-white">{temporaryPassword}</code>
            <button
              type="button"
              onClick={copyPassword}
              className="grid size-10 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/[0.12] text-amber-100 hover:border-amber-200/70"
              aria-label="Copy temporary password"
              title="Copy temporary password"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {bartenders.map((bartender) => (
          <div key={bartender.user_id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm">
            <p className="font-semibold text-white">{bartender.full_name}</p>
            <p className="mt-1 break-all text-white/45">{bartender.email ?? "Email unavailable"}</p>
          </div>
        ))}
        {bartenders.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/55">No bartenders assigned yet.</p>}
      </div>
    </section>
  );
}
