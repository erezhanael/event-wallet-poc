import { StationMonitorDisplay } from "@/components/station-monitor-display";
import { getEvent, getStationByMonitorSlug } from "@/lib/data";

export default async function StationMonitorPage({ params }: { params: Promise<{ eventId: string; stationSlug: string }> }) {
  const { eventId, stationSlug } = await params;
  const [event, station] = await Promise.all([getEvent(eventId), getStationByMonitorSlug(eventId, stationSlug)]);

  if (!event || !station) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020403] p-6 text-white">
        <div className="max-w-xl rounded-[2rem] border border-red-300/30 bg-red-300/[0.10] p-8 text-center">
          <p className="text-3xl font-black">Monitor not found</p>
          <p className="mt-3 text-lg text-white/65">Open the monitor link from the organizer station list.</p>
        </div>
      </main>
    );
  }

  return <StationMonitorDisplay event={event} station={station} />;
}
