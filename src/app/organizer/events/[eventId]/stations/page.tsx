import Link from "next/link";
import { ArrowLeft, Monitor } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StationManager } from "@/components/station-manager";
import { getEvent, getEventStations } from "@/lib/data";

export default async function OrganizerStationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, stations] = await Promise.all([getEvent(eventId), getEventStations(eventId)]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <Link href={`/organizer/events/${event.id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-100 hover:text-white">
        <ArrowLeft size={16} />
        Back to event
      </Link>
      <div className="mb-6">
        <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">POS displays</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Monitor className="text-emerald-200" size={36} />
          <h1 className="premium-heading text-4xl sm:text-5xl">Stations & Monitors</h1>
        </div>
        <p className="mt-2 text-white/55">{event.name}</p>
      </div>
      <StationManager eventId={event.id} initialStations={stations} />
    </AppShell>
  );
}
