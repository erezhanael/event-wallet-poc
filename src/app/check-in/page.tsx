import Link from "next/link";
import { TicketCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MotionPanel, TapMotion } from "@/components/motion-primitives";
import { getEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const events = await getEvents();

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Check-In mode</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Arrival Desk</h1>
        <p className="mt-2 text-white/55">Select an active event to validate tickets and assign NFC wristbands.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((event) => (
          <TapMotion key={event.id}>
            <Link href={`/check-in/events/${event.id}`} className="ticket-card glass-card shine block p-5">
              <span className="grid size-12 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.12] text-cyan-100">
                <TicketCheck size={22} />
              </span>
              <MotionPanel className="mt-5">
                <h2 className="text-2xl font-black text-white">{event.name}</h2>
                <p className="mt-2 text-sm text-white/55">Open check-in station</p>
              </MotionPanel>
            </Link>
          </TapMotion>
        ))}
      </div>
    </AppShell>
  );
}
