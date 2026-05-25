import Link from "next/link";
import { Download, ListPlus, ReceiptText, Ticket } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BartenderManager } from "@/components/bartender-manager";
import { TapMotion } from "@/components/motion-primitives";
import { getEvent, getEventBartenders } from "@/lib/data";

export default async function EventAdminPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, bartenders] = await Promise.all([getEvent(eventId), getEventBartenders(eventId)]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-6">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Event control</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">{event.name}</h1>
        <p className="mt-2 font-mono text-sm text-white/55">Code {event.event_code}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TapMotion>
          <Link href={`/organizer/events/${event.id}/menu`} className="glass-card shine block p-5">
            <ListPlus className="text-emerald-200" />
            <h2 className="mt-4 text-lg font-black text-white">Create Drink Menu</h2>
            <p className="mt-2 text-sm text-white/55">Manage item names, prices, categories, and availability.</p>
          </Link>
        </TapMotion>
        <TapMotion>
          <Link href={`/organizer/events/${event.id}/tickets`} className="glass-card shine block p-5">
            <Ticket className="text-cyan-200" />
            <h2 className="mt-4 text-lg font-black text-white">Tickets</h2>
            <p className="mt-2 text-sm text-white/55">Create ticket types, pricing, and quantities.</p>
          </Link>
        </TapMotion>
        <TapMotion>
          <Link href={`/organizer/events/${event.id}/transactions`} className="glass-card shine block p-5">
            <ReceiptText className="text-fuchsia-200" />
            <h2 className="mt-4 text-lg font-black text-white">Transactions</h2>
            <p className="mt-2 text-sm text-white/55">Review wallet top-ups and purchases.</p>
          </Link>
        </TapMotion>
      </div>
      <div className="mt-4">
        <BartenderManager eventId={event.id} initialBartenders={bartenders} />
      </div>
      <a href={`/api/export-transactions/${event.id}`} className="neon-button mt-5 inline-flex items-center gap-2 px-4 py-3 text-sm">
        <Download size={16} />
        Export Transactions CSV
      </a>
    </AppShell>
  );
}
