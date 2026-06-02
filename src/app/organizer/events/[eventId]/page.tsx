import Link from "next/link";
import { Download, ListPlus, Monitor, ReceiptText, RotateCcw, Ticket } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BartenderManager } from "@/components/bartender-manager";
import { TapMotion } from "@/components/motion-primitives";
import { StationManager } from "@/components/station-manager";
import { VendorManager } from "@/components/vendor-manager";
import { getEvent, getEventBartenders, getEventStations, getEventVendors } from "@/lib/data";

export default async function EventAdminPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, bartenders, vendors, stations] = await Promise.all([
    getEvent(eventId),
    getEventBartenders(eventId),
    getEventVendors(eventId),
    getEventStations(eventId),
  ]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-6">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Event control</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">{event.name}</h1>
        <p className="mt-2 font-mono text-sm text-white/55">Code {event.event_code}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TapMotion className="h-full">
          <Link href={`/organizer/events/${event.id}/menu`} className="glass-card shine flex h-full min-h-[178px] flex-col p-5">
            <ListPlus className="text-emerald-200" />
            <h2 className="mt-4 text-lg font-black text-white">Create Drink Menu</h2>
            <p className="mt-2 text-sm text-white/55">Manage item names, prices, categories, and availability.</p>
          </Link>
        </TapMotion>
        <TapMotion className="h-full">
          <Link href={`/organizer/events/${event.id}/tickets`} className="glass-card shine flex h-full min-h-[178px] flex-col p-5">
            <Ticket className="text-cyan-200" />
            <h2 className="mt-4 text-lg font-black text-white">Tickets</h2>
            <p className="mt-2 text-sm text-white/55">Create ticket types, pricing, and quantities.</p>
          </Link>
        </TapMotion>
        <TapMotion className="h-full">
          <Link href={`/organizer/events/${event.id}/cancellations`} className="glass-card shine flex h-full min-h-[178px] flex-col p-5">
            <RotateCcw className="text-yellow-200" />
            <h2 className="mt-4 text-lg font-black text-white">Cancellations</h2>
            <p className="mt-2 text-sm text-white/55">Approve requests, restore inventory, and track refunds.</p>
          </Link>
        </TapMotion>
        <TapMotion className="h-full">
          <Link href={`/organizer/events/${event.id}/transactions`} className="glass-card shine flex h-full min-h-[178px] flex-col p-5">
            <ReceiptText className="text-fuchsia-200" />
            <h2 className="mt-4 text-lg font-black text-white">Transactions</h2>
            <p className="mt-2 text-sm text-white/55">Review wallet top-ups and purchases.</p>
          </Link>
        </TapMotion>
        <TapMotion className="h-full">
          <Link href={`/organizer/events/${event.id}/stations`} className="glass-card shine flex h-full min-h-[178px] flex-col p-5">
            <Monitor className="text-emerald-200" />
            <h2 className="mt-4 text-lg font-black text-white">Stations & Monitors</h2>
            <p className="mt-2 text-sm text-white/55">Create POS stations and open attendee-facing balance screens.</p>
          </Link>
        </TapMotion>
      </div>
      <div className="mt-4">
        <BartenderManager eventId={event.id} initialBartenders={bartenders} />
      </div>
      <div className="mt-4">
        <VendorManager eventId={event.id} initialVendors={vendors} />
      </div>
      <div className="mt-4">
        <StationManager eventId={event.id} initialStations={stations} />
      </div>
      <a href={`/api/export-transactions/${event.id}`} className="neon-button mt-5 inline-flex items-center gap-2 px-4 py-3 text-sm">
        <Download size={16} />
        Export Transactions CSV
      </a>
    </AppShell>
  );
}
