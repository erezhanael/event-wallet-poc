"use client";

import { useState } from "react";
import { CheckCircle, CreditCard, LockKeyhole, Smartphone, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/money";

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
  const [message, setMessage] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"card" | "apple" | "bit">("card");

  async function approvePayment() {
    setIsProcessing(true);
    setMessage("Approving mock ticket payment...");

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketTypeId }),
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
        </div>
      </section>

      <aside className="glass-card h-fit p-5">
        <span className="grid size-12 place-items-center rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/[0.12] text-fuchsia-100">
          <Ticket size={22} />
        </span>
        <p className="mt-5 text-sm font-semibold text-white/55">Ticket</p>
        <h2 className="mt-1 text-2xl font-black text-white">{ticketName}</h2>
        <p className="mt-4 text-5xl font-black tracking-tight text-white">{formatMoney(amountCents, currency)}</p>
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
          {isProcessing ? "Approving..." : <><CheckCircle size={18} /> Pay and Issue Ticket</>}
        </motion.button>
        {message && <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/[0.64]">{message}</p>}
        <p className="mt-3 text-xs leading-5 text-white/45">
          Demo screen only. This does not charge a real card. The ticket is issued after approving this mock payment.
        </p>
      </aside>
    </div>
  );
}
