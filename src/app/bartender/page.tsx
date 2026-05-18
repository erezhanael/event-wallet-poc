import Link from "next/link";
import { Martini } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BartenderPage() {
  const events = await getEvents();

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-3xl font-semibold">Bartender</h1>
        <p className="mt-2 text-slate-600">Select an assigned event and open the mobile checkout.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((event) => (
          <Link key={event.id} href={`/bartender/checkout/${event.id}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-500">
            <span className="grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Martini size={22} />
            </span>
            <h2 className="mt-4 text-xl font-semibold">{event.name}</h2>
            <p className="mt-2 text-sm text-slate-600">Open checkout</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
