import { AppShell } from "@/components/app-shell";
import { CancellationManager } from "@/components/cancellation-manager";
import { CancellationPolicyManager } from "@/components/cancellation-policy-manager";
import { getCancellationPolicy, getEvent, getTicketCancellationRequests } from "@/lib/data";

export default async function CancellationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, requests, policy] = await Promise.all([
    getEvent(eventId),
    getTicketCancellationRequests(eventId).catch(() => []),
    getCancellationPolicy(eventId).catch(() => null),
  ]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-yellow-300/30 bg-yellow-300/[0.10] text-yellow-100">Cancellation control</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Cancellations</h1>
        <p className="mt-2 text-white/55">{event.name}</p>
      </div>
      <div className="grid gap-5">
        <CancellationPolicyManager eventId={eventId} policy={policy} />
        <CancellationManager currency={event.currency} requests={requests} />
      </div>
    </AppShell>
  );
}
