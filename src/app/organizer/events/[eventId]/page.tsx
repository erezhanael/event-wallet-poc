import Link from "next/link";
import { Download, ListPlus, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BartenderManager } from "@/components/bartender-manager";
import { getEvent, getEventBartenders } from "@/lib/data";

export default async function EventAdminPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, bartenders] = await Promise.all([getEvent(eventId), getEventBartenders(eventId)]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">{event.name}</h1>
        <p className="mt-2 text-slate-600">Code {event.event_code}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`/organizer/events/${event.id}/menu`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-500">
          <ListPlus className="text-emerald-700" />
          <h2 className="mt-4 text-lg font-semibold">Create Drink Menu</h2>
          <p className="mt-2 text-sm text-slate-600">Manage item names, prices, categories, and availability.</p>
        </Link>
        <BartenderManager eventId={event.id} initialBartenders={bartenders} />
        <Link href={`/organizer/events/${event.id}/transactions`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-500">
          <ReceiptText className="text-emerald-700" />
          <h2 className="mt-4 text-lg font-semibold">Transactions</h2>
          <p className="mt-2 text-sm text-slate-600">Review wallet top-ups and purchases.</p>
        </Link>
      </div>
      <a href={`/api/export-transactions/${event.id}`} className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
        <Download size={16} />
        Export Transactions CSV
      </a>
    </AppShell>
  );
}
