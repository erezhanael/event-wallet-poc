import Link from "next/link";
import { Martini, TicketCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MotionPanel, TapMotion } from "@/components/motion-primitives";
import { getEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BartenderPage() {
  const events = await getEvents();

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Tonight&apos;s bar floor</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Bartender</h1>
        <p className="mt-2 text-white/55">Select an assigned event and open the mobile checkout.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((event) => (
          <TapMotion key={event.id}>
            <div className="ticket-card glass-card shine block p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-100">
                  <Martini size={22} />
                </span>
                <TicketCheck className="text-cyan-200" size={20} />
              </div>
              <MotionPanel className="mt-5">
                <h2 className="text-2xl font-black text-white">{event.name}</h2>
                <p className="mt-2 text-sm text-white/55">Open bar checkout or validate entry tickets.</p>
              </MotionPanel>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link href={`/bartender/checkout/${event.id}`} className="neon-button flex h-11 items-center justify-center px-3 text-sm">
                  Checkout
                </Link>
                <Link href={`/bartender/check-in/${event.id}`} className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-3 text-sm font-black text-white/75 hover:bg-white/[0.12]">
                  Check-In
                </Link>
              </div>
            </div>
          </TapMotion>
        ))}
      </div>
    </AppShell>
  );
}
