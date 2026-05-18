import Link from "next/link";
import { Banknote, CalendarDays, CircleDollarSign, ReceiptText, Users } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { DashboardChart } from "@/components/dashboard-chart";
import { EventCreator } from "@/components/event-creator";
import { StatCard } from "@/components/stat-card";
import { getDashboardMetrics, getEvents } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboardPage() {
  const cookieStore = await cookies();
  const organizerId = cookieStore.get("event_wallet_user_id")?.value;
  const allEvents = await getEvents();
  const events = organizerId ? allEvents.filter((currentEvent) => currentEvent.organizer_id === organizerId) : allEvents;
  const [event] = events;
  const metrics = event ? await getDashboardMetrics(event.id) : null;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Organizer Dashboard</h1>
          <p className="mt-2 text-slate-600">{event ? event.name : "Create your first event to start selling with wallets."}</p>
        </div>
        {event && (
          <Link href={`/organizer/events/${event.id}`} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            Manage Event
          </Link>
        )}
      </div>

      {event && metrics && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total prepaid" value={formatMoney(metrics.totalPrepaidCents, event.currency)} icon={Banknote} tone="green" />
            <StatCard label="Total spent" value={formatMoney(metrics.totalSpentCents, event.currency)} icon={CircleDollarSign} />
            <StatCard label="Outstanding" value={formatMoney(metrics.outstandingCents, event.currency)} icon={ReceiptText} tone="amber" />
            <StatCard label="Attendees" value={String(metrics.attendeeCount)} icon={Users} />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <DashboardChart data={metrics.hourlySales} />
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Top-Selling Items</h2>
              <div className="mt-4 space-y-3">
                {metrics.topItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.quantity} sold</p>
                    </div>
                    <p className="font-semibold">{formatMoney(item.revenueCents, event.currency)}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Events</h2>
          <div className="mt-4 grid gap-3">
            {events.map((currentEvent) => (
              <Link
                key={currentEvent.id}
                href={`/organizer/events/${currentEvent.id}`}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 hover:border-emerald-500 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{currentEvent.name}</h3>
                    <span className="rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-600">{currentEvent.event_code}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays size={16} />
                    {new Date(currentEvent.start_time).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-700">Manage</span>
              </Link>
            ))}
          </div>
        </section>
        <EventCreator />
      </div>
    </AppShell>
  );
}
