"use client";

import { useMemo, useState } from "react";
import { Gift, Plus, Save, TicketPercent } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import type { TicketPromotion } from "@/lib/types";

type Draft = {
  code: string;
  description: string;
  discountType: "percent" | "fixed" | "free";
  discountValue: string;
  maxRedemptions: string;
  eligibleEmails: string;
};

const emptyDraft: Draft = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "10",
  maxRedemptions: "",
  eligibleEmails: "",
};

const inputClass =
  "mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-fuchsia-300/60";

function describeDiscount(promotion: TicketPromotion, currency?: string) {
  if (promotion.discount_type === "free") return "Free ticket";
  if (promotion.discount_type === "percent") return `${promotion.discount_value}% off`;
  return `${formatMoney(promotion.discount_value, currency)} off`;
}

export function PromoCodeManager({
  eventId,
  currency,
  initialPromotions,
}: {
  eventId: string;
  currency?: string;
  initialPromotions: TicketPromotion[];
}) {
  const router = useRouter();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sortedPromotions = useMemo(
    () => [...promotions].sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code)),
    [promotions],
  );

  async function createPromotion() {
    if (!draft.code.trim()) {
      setMessage("Add a coupon code.");
      return;
    }

    setIsSaving(true);
    setMessage("Creating coupon...");

    try {
      const response = await fetch("/api/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ...draft }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not create coupon.");
        return;
      }

      setPromotions((current) => [payload, ...current]);
      setDraft(emptyDraft);
      setMessage("Coupon created.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePromotion(promotion: TicketPromotion) {
    setIsSaving(true);
    setMessage(promotion.active ? "Pausing coupon..." : "Activating coupon...");

    try {
      const response = await fetch(`/api/promo-codes/${promotion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !promotion.active }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not update coupon.");
        return;
      }

      setPromotions((current) => current.map((item) => (item.id === promotion.id ? payload : item)));
      setMessage(payload.active ? "Coupon activated." : "Coupon paused.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="glass-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">Promos</p>
          <h2 className="mt-3 text-2xl font-black text-white">Coupons & Free Tickets</h2>
          <p className="mt-1 text-sm text-white/55">Create event-specific codes for selected attendee emails.</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/[0.12] text-fuchsia-100">
          <TicketPercent size={22} />
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[130px_1fr_150px_130px_130px_1fr_auto]">
        <label className="text-sm font-semibold text-white/70">
          Code
          <input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className={inputClass} placeholder="VIP100" />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Note
          <input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className={inputClass} placeholder="Friend list" />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Type
          <select value={draft.discountType} onChange={(event) => setDraft((current) => ({ ...current, discountType: event.target.value as Draft["discountType"] }))} className={inputClass}>
            <option value="percent">Percent</option>
            <option value="fixed">Amount</option>
            <option value="free">Free ticket</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-white/70">
          Value
          <input
            inputMode="decimal"
            value={draft.discountType === "free" ? "" : draft.discountValue}
            onChange={(event) => setDraft((current) => ({ ...current, discountValue: event.target.value }))}
            className={inputClass}
            disabled={draft.discountType === "free"}
            placeholder={draft.discountType === "percent" ? "25" : "50.00"}
          />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Limit
          <input inputMode="numeric" value={draft.maxRedemptions} onChange={(event) => setDraft((current) => ({ ...current, maxRedemptions: event.target.value }))} className={inputClass} placeholder="10" />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Eligible emails
          <input value={draft.eligibleEmails} onChange={(event) => setDraft((current) => ({ ...current, eligibleEmails: event.target.value }))} className={inputClass} placeholder="one@email.com, two@email.com" />
        </label>
        <button type="button" onClick={createPromotion} disabled={isSaving} className="neon-button flex h-11 items-center justify-center gap-2 self-end px-4 text-sm disabled:opacity-50">
          <Plus size={17} />
          Add
        </button>
      </div>

      {message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/60">{message}</p>}

      <div className="mt-5 grid gap-3">
        {sortedPromotions.map((promotion) => (
          <article key={promotion.id} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.10] px-3 py-1 font-mono text-sm font-black text-emerald-100">
                    {promotion.code}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${promotion.active ? "border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100" : "border-white/10 bg-white/[0.08] text-white/45"}`}>
                    {promotion.active ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="mt-3 text-lg font-black text-white">{describeDiscount(promotion, currency)}</p>
                <p className="mt-1 text-sm text-white/50">{promotion.description || "Event promo code"}</p>
              </div>
              <button
                type="button"
                onClick={() => togglePromotion(promotion)}
                disabled={isSaving}
                className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-3 text-sm font-bold text-white/70 hover:bg-white/[0.08] disabled:opacity-50"
              >
                <Save size={16} />
                {promotion.active ? "Pause" : "Activate"}
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-white/55 sm:grid-cols-3">
              <p className="rounded-2xl border border-white/10 bg-black/20 p-3">
                Used <span className="font-black text-white">{promotion.redeemed_count}</span>
                {promotion.max_redemptions ? ` / ${promotion.max_redemptions}` : ""}
              </p>
              <p className="rounded-2xl border border-white/10 bg-black/20 p-3">
                Emails <span className="font-black text-white">{promotion.eligible_emails.length || "Any"}</span>
              </p>
              <p className="rounded-2xl border border-white/10 bg-black/20 p-3">
                Kind <span className="font-black capitalize text-white">{promotion.discount_type}</span>
              </p>
            </div>
          </article>
        ))}
        {sortedPromotions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-white/55">
            <Gift className="mb-3 text-fuchsia-200" />
            No coupons yet. Create one for a guest list, discount drop, or free-ticket invite.
          </div>
        )}
      </div>
    </section>
  );
}
