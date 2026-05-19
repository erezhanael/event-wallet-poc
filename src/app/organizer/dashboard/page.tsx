import Link from "next/link";
import { Banknote, CalendarDays, CircleDollarSign, ReceiptText, Users } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { DashboardChart } from "@/components/dashboard-chart";
import { EventCreator } from "@/components/event-creator";
import { MotionPanel, TapMotion } from "@/components/motion-primitives";
import { ShiftMonitor } from "@/components/shift-monitor";
import { StatCard } from "@/components/stat-card";
import { getBartenderShiftSummary, getDashboardMetrics, getEvents } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboardPage() {
  const cookieStore = await cookies();
  const organizerId = cookieStore.get("event_wallet_user_id")?.value;
  const allEvents = await getEvents();
  const events = organizerId ? allEvents.filter((currentEvent) => currentEvent.organizer_id === organizerId) : allEvents;
  const [event] = events;
  const metrics = event ? await getDashboardMetrics(event.id) : null;
  const shifts = event ? await getBartenderShiftSummary(event.id) : [];

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Operations center</p>
          <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Organizer Dashboard</h1>
          <p className="mt-2 text-white/55">{event ? event.name : "Create your first event to start selling with wallets."}</p>
        </div>
        {event && (
          <Link href={`/organizer/events/${event.id}`} className="neon-button px-4 py-3 text-sm">
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
            <div className="space-y-5">
              <section className="glass-card p-4">
                <h2 className="font-black text-white">Top-Selling Items</h2>
                <div className="mt-4 space-y-3">
                  {metrics.topItems.map((item) => (
                    <MotionPanel key={item.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                      <div>
                        <p className="font-semibold text-white">{item.name}</p>
                        <p className="text-sm text-white/45">{item.quantity} sold</p>
                      </div>
                      <p className="font-black text-emerald-200">{formatMoney(item.revenueCents, event.currency)}</p>
                    </MotionPanel>
                  ))}
                  {metrics.topItems.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/55">No sales yet.</p>}
                </div>
              </section>
              <ShiftMonitor shifts={shifts} />
            </div>
          </div>
        </>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="glass-card p-4">
          <h2 className="font-black text-white">Events</h2>
          <div className="mt-4 grid gap-3">
            {events.map((currentEvent) => (
              <TapMotion key={currentEvent.id}>
                <Link
                  href={`/organizer/events/${currentEvent.id}`}
                  className="ticket-card grid gap-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4 hover:border-emerald-300/45 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-white">{currentEvent.name}</h3>
                      <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.10] px-2 py-1 font-mono text-xs text-cyan-100">{currentEvent.event_code}</span>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-white/50">
                      <CalendarDays size={16} />
                      {new Date(currentEvent.start_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-black text-emerald-200">Manage</span>
                </Link>
              </TapMotion>
            ))}
          </div>
        </section>
        <EventCreator />
      </div>
    </AppShell>
  );
}
