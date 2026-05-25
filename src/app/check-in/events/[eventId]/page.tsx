import { AppShell } from "@/components/app-shell";
import { CheckInClient } from "@/components/check-in-client";
import { getEvent } from "@/lib/data";

export default async function EventCheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">NFC wristbands</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Check-In</h1>
        <p className="mt-2 text-white/55">{event.name}</p>
      </div>
      <CheckInClient eventId={eventId} />
    </AppShell>
  );
}
