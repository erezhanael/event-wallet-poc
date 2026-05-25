import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TicketPurchase } from "@/components/ticket-purchase";
import { getAttendeeTickets, getEvent, getTicketTypes } from "@/lib/data";
import { cookies } from "next/headers";

export default async function AttendeeTicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const attendeeId = cookieStore.get("event_wallet_user_id")?.value;
  const [event, ticketTypes, tickets] = await Promise.all([
    getEvent(eventId),
    getTicketTypes(eventId),
    getAttendeeTickets(eventId, attendeeId),
  ]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Event access</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">{event.name}</h1>
        <p className="mt-2 text-white/55">Buy or view your event ticket before loading your wallet.</p>
      </div>
      {tickets.length > 0 && (
        <section className="glass-card mb-5 p-4">
          <h2 className="text-lg font-black text-white">Your Tickets</h2>
          <div className="mt-3 grid gap-2">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/attendee/wallet/${eventId}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                <p className="font-black text-white">{ticket.ticket_type?.name ?? "Ticket"}</p>
                <p className="mt-1 font-mono text-xs text-white/45">{ticket.ticket_token}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <TicketPurchase eventId={eventId} currency={event.currency} ticketTypes={ticketTypes} />
    </AppShell>
  );
}
