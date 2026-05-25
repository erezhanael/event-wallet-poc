"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TicketCancellationRequest } from "@/lib/types";
import { formatMoney } from "@/lib/money";

export function TicketCancellationRequestForm({
  ticketId,
  currency,
  existingRequest,
}: {
  ticketId: string;
  currency?: string;
  existingRequest?: TicketCancellationRequest;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState(
    existingRequest
      ? `Cancellation ${existingRequest.status}. Estimated refund: ${formatMoney(existingRequest.refund_amount_cents, currency)}.`
      : "Need to cancel? Send a request to the organizer.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function requestCancellation() {
    setIsSubmitting(true);
    setMessage("Sending cancellation request...");

    try {
      const response = await fetch("/api/cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, reason }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not request cancellation.");
        return;
      }

      setReason("");
      setMessage("Cancellation request sent. The organizer can now approve or reject it.");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const locked = Boolean(existingRequest && existingRequest.status !== "rejected");

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-sm font-semibold text-white/[0.68]">{message}</p>
      {!locked && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-11 min-w-0 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm text-white outline-none placeholder:text-white/35"
            placeholder="Optional reason"
          />
          <button
            type="button"
            onClick={requestCancellation}
            disabled={isSubmitting}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/[0.10] px-4 text-sm font-black text-fuchsia-100 disabled:opacity-50"
          >
            <RotateCcw size={16} />
            {isSubmitting ? "Sending" : "Request Cancel"}
          </button>
        </div>
      )}
    </div>
  );
}
