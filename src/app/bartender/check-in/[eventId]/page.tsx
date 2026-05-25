import { AppShell } from "@/components/app-shell";
import { TicketCheckIn } from "@/components/ticket-check-in";
import { getEvent } from "@/lib/data";

export default async function CheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Entry control</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Ticket Check-In</h1>
        <p className="mt-2 text-white/55">{event.name}</p>
      </div>
      <TicketCheckIn eventId={eventId} />
    </AppShell>
  );
}
