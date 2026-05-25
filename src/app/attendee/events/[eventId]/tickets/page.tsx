import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TicketCancellationRequestForm } from "@/components/ticket-cancellation-request-form";
import { TicketPurchase } from "@/components/ticket-purchase";
import { getAttendeeTickets, getEvent, getTicketCancellationRequests, getTicketTypes } from "@/lib/data";
import { cookies } from "next/headers";

export default async function AttendeeTicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const attendeeId = cookieStore.get("event_wallet_user_id")?.value;
  const [event, ticketTypes, tickets, cancellationRequests] = await Promise.all([
    getEvent(eventId),
    getTicketTypes(eventId),
    getAttendeeTickets(eventId, attendeeId),
    getTicketCancellationRequests(eventId, attendeeId).catch(() => []),
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
            {tickets.map((ticket) => {
              const cancellationRequest = cancellationRequests.find((request) => request.ticket_id === ticket.id);
              const canRequestCancellation = ticket.status === "active" && !ticket.checked_in_at;

              return (
                <article key={ticket.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <Link href={`/attendee/wallet/${eventId}`} className="block">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-white">{ticket.ticket_type?.name ?? "Ticket"}</p>
                        <p className="mt-1 font-mono text-xs text-white/45">{ticket.ticket_token}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black capitalize text-white/60">
                        {ticket.status}
                      </span>
                    </div>
                  </Link>
                  {canRequestCancellation && (
                    <TicketCancellationRequestForm ticketId={ticket.id} currency={event.currency} existingRequest={cancellationRequest} />
                  )}
                  {!canRequestCancellation && (
                    <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/55">
                      This ticket cannot be cancelled because it is {ticket.status === "checked_in" || ticket.checked_in_at ? "already checked in" : ticket.status}.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
      <TicketPurchase eventId={eventId} currency={event.currency} ticketTypes={ticketTypes} />
    </AppShell>
  );
}
