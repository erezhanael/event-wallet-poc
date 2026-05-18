import Link from "next/link";
import { Banknote, CircleDollarSign, ReceiptText, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardChart } from "@/components/dashboard-chart";
import { StatCard } from "@/components/stat-card";
import { getDashboardMetrics, getEvents } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export default async function OrganizerDashboardPage() {
  const [event] = await getEvents();
  const metrics = await getDashboardMetrics(event.id);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Organizer Dashboard</h1>
          <p className="mt-2 text-slate-600">{event.name}</p>
        </div>
        <Link href={`/organizer/events/${event.id}`} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          Manage Event
        </Link>
      </div>
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
    </AppShell>
  );
}
