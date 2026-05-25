"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import type { TicketCancellationRequest } from "@/lib/types";

export function CancellationManager({
  currency,
  requests,
}: {
  currency?: string;
  requests: TicketCancellationRequest[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Review cancellation requests and keep the door list clean.");

  async function reviewRequest(requestId: string, action: "approve" | "reject") {
    setActiveId(requestId);
    setMessage(action === "approve" ? "Approving cancellation..." : "Rejecting cancellation...");

    try {
      const response = await fetch(`/api/cancellations/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, organizerNote: noteById[requestId] ?? "" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not review cancellation.");
        return;
      }

      setMessage(action === "approve" ? "Cancellation approved. Refund record created." : "Cancellation rejected.");
      router.refresh();
    } finally {
      setActiveId(null);
    }
  }

  return (
    <section className="glass-card p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">Cancellation ops</p>
          <h2 className="mt-3 text-2xl font-black text-white">Requests</h2>
        </div>
        <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/[0.64]">{message}</p>
      </div>

      <div className="mt-5 grid gap-3">
        {requests.map((request) => (
          <article key={request.id} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${
                    request.status === "pending"
                      ? "border-yellow-300/30 bg-yellow-300/[0.10] text-yellow-100"
                      : request.status === "approved"
                        ? "border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100"
                        : "border-red-300/30 bg-red-300/[0.10] text-red-100"
                  }`}>
                    {request.status}
                  </span>
                  <span className="font-mono text-xs text-white/40">{request.ticket?.ticket_token}</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-white">{request.attendee_name ?? "Attendee"}</h3>
                <p className="mt-1 text-sm text-white/50">{request.ticket?.ticket_type?.name ?? "Ticket"}</p>
                <p className="mt-2 text-sm text-white/[0.68]">
                  Reason: {request.reason || "No reason provided"}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-white/45">Estimated refund</p>
                <p className="text-2xl font-black text-emerald-100">{formatMoney(request.refund_amount_cents, currency)}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">{request.refund_mode}</p>
              </div>
            </div>

            {request.organizer_note && (
              <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
                Organizer note: {request.organizer_note}
              </p>
            )}

            {request.status === "pending" && (
              <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={noteById[request.id] ?? ""}
                  onChange={(event) => setNoteById((current) => ({ ...current, [request.id]: event.target.value }))}
                  className="h-11 min-w-0 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35"
                  placeholder="Organizer note"
                />
                <button
                  type="button"
                  onClick={() => reviewRequest(request.id, "reject")}
                  disabled={activeId !== null}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-300/25 bg-red-300/[0.10] px-4 text-sm font-black text-red-100 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => reviewRequest(request.id, "approve")}
                  disabled={activeId !== null}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.12] px-4 text-sm font-black text-emerald-100 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
              </div>
            )}
          </article>
        ))}

        {requests.length === 0 && (
          <p className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-sm text-white/55">
            No cancellation requests yet.
          </p>
        )}
      </div>
    </section>
  );
}
