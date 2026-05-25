"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/money";
import type { TicketType } from "@/lib/types";

export function TicketPurchase({
  eventId,
  currency,
  ticketTypes,
}: {
  eventId: string;
  currency?: string;
  ticketTypes: TicketType[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSavingId, setIsSavingId] = useState<string | null>(null);

  async function buyTicket(ticketTypeId: string) {
    setIsSavingId(ticketTypeId);
    setMessage("Opening ticket checkout...");
    router.push(`/attendee/events/${eventId}/tickets/mock-checkout?ticketTypeId=${encodeURIComponent(ticketTypeId)}`);
  }

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">Tickets</p>
          <h2 className="mt-3 text-2xl font-black text-white">Choose Access</h2>
        </div>
        <Ticket className="text-emerald-200" />
      </div>
      {message && <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/60">{message}</p>}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {ticketTypes.map((ticketType) => {
          const remaining = Math.max(0, ticketType.quantity_total - ticketType.quantity_sold);
          const soldOut = remaining === 0;

          return (
            <motion.article
              key={ticketType.id}
              whileHover={{ y: -3 }}
              className="ticket-card rounded-3xl border border-white/10 bg-white/[0.06] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-white">{ticketType.name}</h3>
                  <p className="mt-1 text-sm text-white/50">{ticketType.description ?? "Event entry ticket"}</p>
                </div>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.10] px-3 py-1 text-sm font-black text-emerald-100">
                  {formatMoney(ticketType.price_cents, currency)}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="font-semibold text-white/50">{remaining} left</span>
                <button
                  type="button"
                  onClick={() => buyTicket(ticketType.id)}
                  disabled={soldOut || isSavingId !== null}
                  className="neon-button flex h-11 items-center gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-white/35 disabled:shadow-none"
                >
                  <CheckCircle size={16} />
                  {soldOut ? "Sold out" : isSavingId === ticketType.id ? "Issuing..." : "Get Ticket"}
                </button>
              </div>
            </motion.article>
          );
        })}
        {ticketTypes.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-white/55">
            Tickets are not on sale yet. You can still open your wallet.
          </p>
        )}
      </div>
      <Link href={`/attendee/wallet/${eventId}`} className="mt-4 inline-flex text-sm font-bold text-cyan-100 hover:text-white">
        Open wallet
      </Link>
    </section>
  );
}
