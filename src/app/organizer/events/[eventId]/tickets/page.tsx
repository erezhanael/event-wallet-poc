import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PromoCodeManager } from "@/components/promo-code-manager";
import { TicketSalesDashboard } from "@/components/ticket-sales-dashboard";
import { TicketTypeManager } from "@/components/ticket-type-manager";
import { getEvent, getTicketPromotions, getTicketSalesDashboard, getTicketTypes } from "@/lib/data";

const neonRooftopEventId = "11111111-1111-4111-8111-111111111111";

export default async function TicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ ticketData?: string }>;
}) {
  const { eventId } = await params;
  const { ticketData } = await searchParams;
  const showProducerToggle = eventId === neonRooftopEventId;
  const ticketDataMode = showProducerToggle && ticketData !== "live" ? "mockup" : "live";
  const [event, ticketTypes, promotions, ticketSalesDashboard] = await Promise.all([
    getEvent(eventId),
    getTicketTypes(eventId, true),
    getTicketPromotions(eventId).catch(() => []),
    getTicketSalesDashboard(eventId, ticketDataMode),
  ]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">Ticketing</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Tickets</h1>
        <p className="mt-2 text-white/55">{event.name}</p>
      </div>
      <div className="grid gap-5">
        {showProducerToggle && (
          <section className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">Producer dashboard mode</p>
              <p className="mt-1 text-sm text-white/55">Use mockup data for the meeting story, or switch back to the real live ticket data.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              <Link
                href={`/organizer/events/${eventId}/tickets?ticketData=mockup`}
                className={`rounded-xl px-3 py-2 text-center text-sm font-black transition ${
                  ticketDataMode === "mockup" ? "bg-emerald-300 text-black" : "text-white/60 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Producer mockup
              </Link>
              <Link
                href={`/organizer/events/${eventId}/tickets?ticketData=live`}
                className={`rounded-xl px-3 py-2 text-center text-sm font-black transition ${
                  ticketDataMode === "live" ? "bg-cyan-300 text-black" : "text-white/60 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Live data
              </Link>
            </div>
          </section>
        )}
        <TicketSalesDashboard metrics={ticketSalesDashboard} currency={event.currency} />
        <TicketTypeManager eventId={eventId} currency={event.currency} initialTicketTypes={ticketTypes} />
        <PromoCodeManager eventId={eventId} currency={event.currency} initialPromotions={promotions} />
      </div>
    </AppShell>
  );
}
