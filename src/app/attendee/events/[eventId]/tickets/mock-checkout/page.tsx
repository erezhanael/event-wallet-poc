import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TicketMockPaymentForm } from "@/components/ticket-mock-payment-form";
import { getEvent, getTicketTypes } from "@/lib/data";

export default async function TicketMockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ ticketTypeId?: string }>;
}) {
  const { eventId } = await params;
  const { ticketTypeId } = await searchParams;
  const [event, ticketTypes] = await Promise.all([getEvent(eventId), getTicketTypes(eventId)]);
  const ticketType = ticketTypes.find((currentTicketType) => currentTicketType.id === ticketTypeId);

  if (!event || !ticketType) {
    return (
      <AppShell>
        <section className="glass-card mx-auto max-w-xl p-6">
          <h1 className="text-2xl font-black text-white">Ticket checkout unavailable</h1>
          <p className="mt-2 text-white/55">Return to tickets and choose an available ticket type again.</p>
          <Link href={`/attendee/events/${eventId}/tickets`} className="neon-button mt-5 inline-flex h-11 items-center px-4 text-sm">
            Back to Tickets
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TicketMockPaymentForm
        eventId={eventId}
        ticketTypeId={ticketType.id}
        ticketName={ticketType.name}
        amountCents={ticketType.price_cents}
        currency={event.currency}
      />
    </AppShell>
  );
}
