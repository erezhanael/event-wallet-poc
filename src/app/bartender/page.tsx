import Link from "next/link";
import { ArrowRight, Martini } from "lucide-react";
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
            <Link href={`/bartender/checkout/${event.id}`} className="ticket-card glass-card shine block p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-100">
                  <Martini size={22} />
                </span>
                <ArrowRight className="text-white/50" size={20} />
              </div>
              <MotionPanel className="mt-5">
                <h2 className="text-2xl font-black text-white">{event.name}</h2>
                <p className="mt-2 text-sm text-white/55">Open checkout</p>
              </MotionPanel>
            </Link>
          </TapMotion>
        ))}
      </div>
    </AppShell>
  );
}
