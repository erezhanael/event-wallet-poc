"use client";

import { useState } from "react";
import { CheckCircle, CreditCard, LockKeyhole, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/money";

export function MockPaymentForm({
  eventId,
  amountCents,
  currency,
}: {
  eventId: string;
  amountCents: number;
  currency?: string;
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "apple" | "bit">("card");

  function approvePayment() {
    setIsProcessing(true);
    window.setTimeout(() => {
      router.push(`/attendee/wallet/${eventId}?checkout=mock-success`);
      router.refresh();
    }, 850);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="glass-card shine p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Mock checkout</p>
            <h1 className="premium-heading mt-3 text-4xl">Payment</h1>
          </div>
          <span className="grid size-12 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-100">
            <LockKeyhole size={22} />
          </span>
        </div>

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

        <div className="mt-6 space-y-3">
          <label className="block text-sm font-semibold text-white/70">
            Card number
            <input
              inputMode="numeric"
              defaultValue="4242 4242 4242 4242"
              className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/60"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-white/70">
              Expiry
              <input
                inputMode="numeric"
                defaultValue="12 / 29"
                className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/60"
              />
            </label>
            <label className="block text-sm font-semibold text-white/70">
              CVC
              <input
                inputMode="numeric"
                defaultValue="123"
                className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/60"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-white/70">
            Name on card
            <input
              defaultValue="Noam Attendee"
              className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-emerald-300/60"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-white">VISA</span>
          <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-white">Mastercard</span>
          <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-white">Apple Pay</span>
          <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-white">Bank Hapoalim bit</span>
        </div>
      </section>

      <aside className="glass-card h-fit p-5">
        <p className="text-sm font-semibold text-white/55">Top-up amount</p>
        <p className="mt-2 text-5xl font-black tracking-tight text-white">{formatMoney(amountCents, currency)}</p>
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-sm font-semibold text-white/55">Payment method</p>
          <p className="mt-1 text-lg font-black capitalize text-cyan-100">{selectedMethod === "bit" ? "Bank Hapoalim bit" : selectedMethod}</p>
        </div>
        <motion.button
          type="button"
          onClick={approvePayment}
          disabled={isProcessing}
          whileTap={{ scale: 0.98 }}
          className="neon-button mt-5 flex h-14 w-full items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70"
        >
          {isProcessing ? (
            "Approving..."
          ) : (
            <>
              <CheckCircle size={18} />
              Pay mock top-up
            </>
          )}
        </motion.button>
        <p className="mt-3 text-xs leading-5 text-white/45">
          Demo screen only. This does not charge a real card or update the Supabase wallet balance.
        </p>
      </aside>
    </div>
  );
}
