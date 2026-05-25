"use client";

import { useState } from "react";
import { Save, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { defaultCancellationPolicy } from "@/lib/data";
import type { CancellationPolicy } from "@/lib/types";

const inputClass =
  "mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/60";

export function CancellationPolicyManager({
  eventId,
  policy,
}: {
  eventId: string;
  policy: CancellationPolicy | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(policy?.enabled ?? defaultCancellationPolicy.enabled);
  const [fullRefundUntilHours, setFullRefundUntilHours] = useState(String(policy?.full_refund_until_hours ?? defaultCancellationPolicy.full_refund_until_hours));
  const [partialRefundUntilHours, setPartialRefundUntilHours] = useState(String(policy?.partial_refund_until_hours ?? defaultCancellationPolicy.partial_refund_until_hours));
  const [partialRefundPercent, setPartialRefundPercent] = useState(String(policy?.partial_refund_percent ?? defaultCancellationPolicy.partial_refund_percent));
  const [refundMode, setRefundMode] = useState(policy?.refund_mode ?? defaultCancellationPolicy.refund_mode);
  const [requiresApproval, setRequiresApproval] = useState(policy?.requires_approval ?? defaultCancellationPolicy.requires_approval);
  const [blockAfterCheckin, setBlockAfterCheckin] = useState(policy?.block_after_checkin ?? defaultCancellationPolicy.block_after_checkin);
  const [message, setMessage] = useState("Automation rules calculate the refund estimate when an attendee requests cancellation.");
  const [isSaving, setIsSaving] = useState(false);

  async function savePolicy() {
    setIsSaving(true);
    setMessage("Saving cancellation policy...");

    try {
      const response = await fetch(`/api/cancellation-policies/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          fullRefundUntilHours,
          partialRefundUntilHours,
          partialRefundPercent,
          refundMode,
          requiresApproval,
          blockAfterCheckin,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not save cancellation policy.");
        return;
      }

      setMessage("Cancellation policy saved. New requests will use these rules.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="glass-card p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">
            <SlidersHorizontal size={13} />
            Automation
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">Cancellation Policy</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            Set the rules once. The app calculates refund amounts automatically for every new cancellation request.
          </p>
        </div>
        <button type="button" onClick={savePolicy} disabled={isSaving} className="neon-button flex h-11 items-center justify-center gap-2 px-4 text-sm disabled:opacity-50">
          <Save size={16} />
          {isSaving ? "Saving" : "Save Policy"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <label className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <span className="text-sm font-black text-white">Policy enabled</span>
          <span className="mt-3 flex items-center justify-between gap-3 text-sm text-white/55">
            Allow cancellation requests
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-5 accent-emerald-300" />
          </span>
        </label>

        <label className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <span className="text-sm font-black text-white">Manual approval</span>
          <span className="mt-3 flex items-center justify-between gap-3 text-sm text-white/55">
            Organizer reviews each request
            <input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} className="size-5 accent-emerald-300" />
          </span>
        </label>

        <label className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <span className="text-sm font-black text-white">Block checked-in tickets</span>
          <span className="mt-3 flex items-center justify-between gap-3 text-sm text-white/55">
            Prevent used ticket cancellation
            <input type="checkbox" checked={blockAfterCheckin} onChange={(event) => setBlockAfterCheckin(event.target.checked)} className="size-5 accent-emerald-300" />
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-sm font-semibold text-white/70">
          Full refund until hours before event
          <input inputMode="numeric" value={fullRefundUntilHours} onChange={(event) => setFullRefundUntilHours(event.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Partial refund until hours before event
          <input inputMode="numeric" value={partialRefundUntilHours} onChange={(event) => setPartialRefundUntilHours(event.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Partial refund percent
          <input inputMode="numeric" value={partialRefundPercent} onChange={(event) => setPartialRefundPercent(event.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Refund method
          <select value={refundMode} onChange={(event) => setRefundMode(event.target.value as CancellationPolicy["refund_mode"])} className={inputClass}>
            <option value="manual">Manual</option>
            <option value="wallet_credit">Wallet credit</option>
            <option value="original_payment">Original payment</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.08] p-4 text-sm text-cyan-50/80">
        <p className="font-black text-cyan-100">Current automation</p>
        <p className="mt-2 leading-6">
          {enabled
            ? `100% refund ${fullRefundUntilHours}+ hours before event, ${partialRefundPercent}% refund from ${partialRefundUntilHours}-${fullRefundUntilHours} hours, then no automatic refund estimate.`
            : "Cancellation requests are disabled for this event."}
        </p>
      </div>

      <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/[0.64]">{message}</p>
    </section>
  );
}
