import { AppShell } from "@/components/app-shell";
import { CancellationManager } from "@/components/cancellation-manager";
import { getEvent, getTicketCancellationRequests } from "@/lib/data";

export default async function CancellationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, requests] = await Promise.all([
    getEvent(eventId),
    getTicketCancellationRequests(eventId).catch(() => []),
  ]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-yellow-300/30 bg-yellow-300/[0.10] text-yellow-100">Cancellation control</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Cancellations</h1>
        <p className="mt-2 text-white/55">{event.name}</p>
      </div>
      <CancellationManager currency={event.currency} requests={requests} />
    </AppShell>
  );
}
