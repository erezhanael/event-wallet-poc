"use client";

import { useState } from "react";
import { CheckCircle, CreditCard, LockKeyhole, Smartphone, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/money";

type CouponPreview = {
  code: string;
  discount_cents: number;
  paid_amount_cents: number;
  discount_type?: "percent" | "fixed" | "free";
};

export function TicketMockPaymentForm({
  eventId,
  ticketTypeId,
  ticketName,
  amountCents,
  currency,
}: {
  eventId: string;
  ticketTypeId: string;
  ticketName: string;
  amountCents: number;
  currency?: string;
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"card" | "apple" | "bit">("card");
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);

  const finalAmountCents = couponPreview?.paid_amount_cents ?? amountCents;

  async function applyCoupon() {
    if (!couponCode.trim()) {
      setMessage("Enter a coupon code.");
      return;
    }

    setIsCheckingCoupon(true);
    setMessage("Checking coupon...");

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketTypeId, couponCode }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setCouponPreview(null);
        setMessage(payload.error ?? "Coupon rejected.");
        return;
      }

      setCouponPreview(payload);
      setCouponCode(payload.code);
      setMessage(payload.paid_amount_cents === 0 ? "Free ticket unlocked." : "Coupon applied.");
    } finally {
      setIsCheckingCoupon(false);
    }
  }

  async function approvePayment() {
    setIsProcessing(true);
    setMessage(finalAmountCents === 0 ? "Issuing free ticket..." : "Approving mock ticket payment...");

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketTypeId, couponCode: couponPreview?.code ?? "" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not issue ticket.");
        return;
      }

      setMessage("Ticket issued.");
      window.setTimeout(() => {
        router.push(`/attendee/wallet/${eventId}?ticket=purchased`);
        router.refresh();
      }, 600);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="glass-card shine p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">Ticket checkout</p>
            <h1 className="premium-heading mt-3 text-4xl">Payment</h1>
          </div>
          <span className="grid size-12 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-100">
            <LockKeyhole size={22} />
          </span>
        </div>

        {finalAmountCents > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { id: "apple", label: "Apple Pay", icon: <Smartphone size={18} /> },
              { id: "bit", label: "bit", icon: <span className="text-lg font-black italic">bit</span> },
              { id: "card", label: "Card", icon: <CreditCard size={18} /> },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id as "card" | "apple" | "bit")}
                className={`flex h-14 items-center justify-center gap-2 rounded-2xl border text-sm font-black transition ${
                  selectedMethod === method.id
                    ? "border-emerald-300/50 bg-emerald-300/[0.14] text-emerald-100 shadow-[0_0_32px_rgba(34,197,94,0.16)]"
                    : "border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
                }`}
              >
                {method.icon}
                {method.label}
              </button>
            ))}
          </div>
        )}

        {finalAmountCents > 0 && <div className="mt-6 space-y-3">
          <label className="block text-sm font-semibold text-white/70">
            Card number
            <input inputMode="numeric" defaultValue="4242 4242 4242 4242" className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/60" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-white/70">
              Expiry
              <input inputMode="numeric" defaultValue="12 / 29" className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/60" />
            </label>
            <label className="block text-sm font-semibold text-white/70">
              CVC
              <input inputMode="numeric" defaultValue="123" className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/60" />
            </label>
          </div>
          <label className="block text-sm font-semibold text-white/70">
            Name on card
            <input defaultValue="Event Attendee" className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-emerald-300/60" />
          </label>
        </div>}

        {finalAmountCents === 0 && (
          <div className="mt-6 rounded-3xl border border-emerald-300/25 bg-emerald-300/[0.10] p-4 text-sm text-emerald-50">
            This coupon covers the full ticket price. No card details are needed for this demo checkout.
          </div>
        )}
      </section>

      <aside className="glass-card h-fit p-5">
        <span className="grid size-12 place-items-center rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/[0.12] text-fuchsia-100">
          <Ticket size={22} />
        </span>
        <p className="mt-5 text-sm font-semibold text-white/55">Ticket</p>
        <h2 className="mt-1 text-2xl font-black text-white">{ticketName}</h2>
        <p className="mt-4 text-5xl font-black tracking-tight text-white">{formatMoney(finalAmountCents, currency)}</p>
        {couponPreview && (
          <p className="mt-2 text-sm font-bold text-emerald-100">
            {couponPreview.code} saved {formatMoney(couponPreview.discount_cents, currency)}
          </p>
        )}
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-sm font-semibold text-white/55">Coupon</p>
          <div className="mt-2 flex gap-2">
            <input
              value={couponCode}
              onChange={(event) => {
                setCouponCode(event.target.value.toUpperCase());
                setCouponPreview(null);
              }}
              className="h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none placeholder:text-white/35 focus:border-fuchsia-300/60"
              placeholder="VIP100"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={isCheckingCoupon || isProcessing}
              className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/[0.12] px-3 text-sm font-black text-fuchsia-100 disabled:opacity-50"
            >
              {isCheckingCoupon ? "..." : "Apply"}
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-sm font-semibold text-white/55">Payment method</p>
          <p className="mt-1 text-lg font-black capitalize text-cyan-100">{finalAmountCents === 0 ? "Coupon comp" : selectedMethod === "bit" ? "Bank Hapoalim bit" : selectedMethod}</p>
        </div>
        <motion.button
          type="button"
          onClick={approvePayment}
          disabled={isProcessing}
          whileTap={{ scale: 0.98 }}
          className="neon-button mt-5 flex h-14 w-full items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70"
        >
          {isProcessing ? "Approving..." : <><CheckCircle size={18} /> {finalAmountCents === 0 ? "Issue Free Ticket" : "Pay and Issue Ticket"}</>}
        </motion.button>
        {message && <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/[0.64]">{message}</p>}
        <p className="mt-3 text-xs leading-5 text-white/45">
          Demo screen only. This does not charge a real card. The ticket is issued after approving this mock payment.
        </p>
      </aside>
    </div>
  );
}
