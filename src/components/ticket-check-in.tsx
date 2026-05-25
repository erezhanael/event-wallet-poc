"use client";

import { useState } from "react";
import { CheckCircle, Search, TicketCheck, XCircle } from "lucide-react";

type CheckInResult = {
  ok?: boolean;
  already_checked_in?: boolean;
  status?: string;
  ticket_type?: string;
  checked_in_at?: string;
  error?: string;
};

export function TicketCheckIn({ eventId }: { eventId: string }) {
  const [ticketToken, setTicketToken] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function checkIn() {
    if (!ticketToken.trim()) {
      setResult({ error: "Enter or scan a ticket token." });
      return;
    }

    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch("/api/tickets/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketToken }),
      });
      const payload = await response.json();
      setResult(response.ok ? payload : { error: payload.error ?? "Ticket rejected." });
    } finally {
      setIsSaving(false);
    }
  }

  const isSuccess = Boolean(result?.ok);

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Door check-in</p>
          <h2 className="mt-3 text-2xl font-black text-white">Validate Ticket</h2>
        </div>
        <TicketCheck className="text-emerald-200" />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
          <Search size={18} className="text-cyan-200" />
          <input
            value={ticketToken}
            onChange={(event) => setTicketToken(event.target.value)}
            className="h-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/35"
            placeholder="ticket token"
          />
        </label>
        <button type="button" onClick={checkIn} disabled={isSaving} className="neon-button h-12 px-5 text-sm disabled:opacity-50">
          {isSaving ? "Checking..." : "Check In"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-3xl border p-4 ${
            isSuccess ? "border-emerald-300/30 bg-emerald-300/[0.12] text-emerald-100" : "border-red-300/30 bg-red-300/[0.12] text-red-100"
          }`}
        >
          <div className="flex items-center gap-2 font-black">
            {isSuccess ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {isSuccess ? (result.already_checked_in ? "Already Checked In" : "Ticket Valid") : "Ticket Invalid"}
          </div>
          {result.error && <p className="mt-2 text-sm">{result.error}</p>}
          {result.ticket_type && <p className="mt-2 text-sm">Type: {result.ticket_type}</p>}
          {result.checked_in_at && <p className="mt-1 text-xs opacity-75">Checked in: {new Date(result.checked_in_at).toLocaleString()}</p>}
        </div>
      )}
    </section>
  );
}
