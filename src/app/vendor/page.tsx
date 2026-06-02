import Link from "next/link";
import { MonitorUp, Store } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { MotionPanel, TapMotion } from "@/components/motion-primitives";
import { getVendorEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function VendorPage() {
  const cookieStore = await cookies();
  const vendorId = cookieStore.get("event_wallet_user_id")?.value;
  const events = await getVendorEvents(vendorId);

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Vendor floor</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Vendor</h1>
        <p className="mt-2 text-white/55">Manage your event menu, open POS, and charge attendee wallets.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((event) => (
          <TapMotion key={event.id}>
            <div className="ticket-card glass-card shine block p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.12] text-cyan-100">
                  <Store size={22} />
                </span>
                <MonitorUp className="text-emerald-200" size={20} />
              </div>
              <MotionPanel className="mt-5">
                <h2 className="text-2xl font-black text-white">{event.name}</h2>
                <p className="mt-2 text-sm text-white/55">Create your menu and sell from your assigned station.</p>
              </MotionPanel>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link href={`/vendor/events/${event.id}`} className="neon-button flex h-11 items-center justify-center px-3 text-sm">
                  Manage Menu
                </Link>
                <Link href={`/vendor/checkout/${event.id}`} className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-3 text-sm font-black text-white/75 hover:bg-white/[0.12]">
                  Open POS
                </Link>
              </div>
            </div>
          </TapMotion>
        ))}
        {events.length === 0 && <p className="glass-card p-5 text-white/55">No vendor event assignments yet.</p>}
      </div>
    </AppShell>
  );
}
