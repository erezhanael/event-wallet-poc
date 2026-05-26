import { AppShell } from "@/components/app-shell";
import { PromoCodeManager } from "@/components/promo-code-manager";
import { TicketTypeManager } from "@/components/ticket-type-manager";
import { getEvent, getTicketPromotions, getTicketTypes } from "@/lib/data";

export default async function TicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, ticketTypes, promotions] = await Promise.all([
    getEvent(eventId),
    getTicketTypes(eventId, true),
    getTicketPromotions(eventId).catch(() => []),
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
        <TicketTypeManager eventId={eventId} currency={event.currency} initialTicketTypes={ticketTypes} />
        <PromoCodeManager eventId={eventId} currency={event.currency} initialPromotions={promotions} />
      </div>
    </AppShell>
  );
}
