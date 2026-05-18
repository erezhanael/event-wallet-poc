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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <UserPlus className="text-emerald-700" />
      <h2 className="mt-4 text-lg font-semibold">Add Bartenders</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
            placeholder="bartender@example.com"
          />
        </label>
        <button
          type="button"
          onClick={addBartender}
          disabled={isSaving}
          className="flex h-11 items-center justify-center gap-2 self-end rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <UserPlus size={17} />
          Add
        </button>
      </div>
      {message && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
      {temporaryPassword && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Temporary password</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-white px-2 py-2 text-sm text-slate-950">{temporaryPassword}</code>
            <button
              type="button"
              onClick={copyPassword}
              className="grid size-10 place-items-center rounded-md border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
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
          <div key={bartender.user_id} className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="font-medium">{bartender.full_name}</p>
            <p className="mt-1 break-all text-slate-500">{bartender.email ?? "Email unavailable"}</p>
          </div>
        ))}
        {bartenders.length === 0 && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No bartenders assigned yet.</p>}
      </div>
    </section>
  );
}
