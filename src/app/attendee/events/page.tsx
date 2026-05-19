import Link from "next/link";
import { CalendarDays, Flame, Ticket, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MotionPanel, TapMotion } from "@/components/motion-primitives";
import { getEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AttendeeEventsPage() {
  const events = await getEvents();

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="neon-badge mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase">Tonight&apos;s access</p>
          <h1 className="premium-heading text-5xl font-black">My Events</h1>
          <p className="mt-2 text-white/60">Join with an event code and open your prepaid wallet.</p>
        </div>
        <form className="glass-card-soft flex gap-2 rounded-2xl p-2">
          <input className="h-11 min-w-0 rounded-xl border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none placeholder:text-white/35" placeholder="Event code" defaultValue="NEON-2026" />
          <button className="neon-button rounded-xl px-4 text-sm font-black">Join</button>
        </form>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <TapMotion key={event.id}>
            <MotionPanel className="h-full">
              <Link href={`/attendee/wallet/${event.id}`} className="ticket-card glass-card shine block min-h-64 rounded-[2rem] p-5">
                <div className="relative z-10 flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.15] text-emerald-100 shadow-[0_0_28px_rgba(56,255,156,0.2)]">
                    <Ticket size={23} />
                  </span>
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 font-mono text-xs text-white/[0.78]">{event.event_code}</span>
                </div>
                <div className="relative z-10 mt-16">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-pink-400/[0.15] px-2 py-1 text-xs font-bold text-pink-100">Rooftop</span>
                    <span className="rounded-full bg-cyan-400/[0.15] px-2 py-1 text-xs font-bold text-cyan-100">Live Bar</span>
                    <span className="rounded-full bg-emerald-400/[0.15] px-2 py-1 text-xs font-bold text-emerald-100">Wallet Ready</span>
                  </div>
                  <h2 className="premium-heading text-3xl font-black text-white">{event.name}</h2>
                  <div className="mt-4 grid gap-2 text-sm text-white/[0.68]">
                    <p className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      {new Date(event.start_time).toLocaleString()}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users size={16} />
                      96 checked in
                    </p>
                    <p className="flex items-center gap-2 text-emerald-200">
                      <Flame size={16} />
                      Opens in party mode
                    </p>
                  </div>
                </div>
              </Link>
            </MotionPanel>
          </TapMotion>
        ))}
      </div>
    </AppShell>
  );
}
