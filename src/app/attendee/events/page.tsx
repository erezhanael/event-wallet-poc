import Link from "next/link";
import { CalendarDays, Ticket } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getEvents } from "@/lib/data";

export default async function AttendeeEventsPage() {
  const events = await getEvents();

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">My Events</h1>
          <p className="mt-2 text-slate-600">Join with an event code and open your prepaid wallet.</p>
        </div>
        <form className="flex gap-2">
          <input className="h-11 rounded-md border border-slate-300 px-3 text-sm" placeholder="Event code" defaultValue="NEON-2026" />
          <button className="rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white">Join</button>
        </form>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <Link key={event.id} href={`/attendee/wallet/${event.id}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-500">
            <div className="flex items-start justify-between">
              <span className="grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Ticket size={22} />
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs">{event.event_code}</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold">{event.name}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays size={16} />
              {new Date(event.start_time).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
