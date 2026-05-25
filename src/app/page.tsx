import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, QrCode, Sparkles, Ticket, Users } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { getPublicEventSummaries } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await getPublicEventSummaries();
  const [featuredEvent] = events;

  return (
    <PublicShell>
      <section className="grid min-h-[calc(100vh-120px)] gap-8 py-8 lg:grid-cols-[1fr_430px] lg:items-center">
        <div>
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">
            <Sparkles size={14} />
            Tickets + Wallets + Bar Payments
          </p>
          <h1 className="premium-heading mt-5 max-w-3xl text-5xl font-black leading-none sm:text-7xl">
            Your night starts before the door.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
            Discover upcoming events, buy tickets, preload your wallet, scan in at the entrance, and pay fast at the bar.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#events" className="neon-button inline-flex h-12 items-center gap-2 px-5 text-sm">
              Explore Events
              <ArrowRight size={17} />
            </a>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white/80 hover:bg-white/[0.12]">
              Login
            </Link>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: "Buy ticket", icon: Ticket },
              { label: "Load wallet", icon: CreditCard },
              { label: "Scan fast", icon: QrCode },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-3">
                <item.icon size={19} className="text-cyan-200" />
                <p className="mt-3 text-sm font-black text-white">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="glass-card shine p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Featured</p>
          {featuredEvent ? (
            <>
              <h2 className="premium-heading mt-4 text-4xl">{featuredEvent.name}</h2>
              <div className="mt-5 space-y-3 text-sm text-white/65">
                <p className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  {new Date(featuredEvent.start_time).toLocaleString()}
                </p>
                <p className="flex items-center gap-2">
                  <Users size={16} />
                  {featuredEvent.ticketsAvailable} tickets available
                </p>
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.10] p-4">
                <p className="text-sm text-emerald-100/70">Tickets from</p>
                <p className="mt-1 text-4xl font-black text-white">
                  {featuredEvent.lowestTicketPriceCents === null ? "Soon" : formatMoney(featuredEvent.lowestTicketPriceCents, featuredEvent.currency)}
                </p>
              </div>
              <Link href={`/events/${featuredEvent.id}`} className="neon-button mt-5 flex h-12 items-center justify-center px-4 text-sm">
                View Tickets
              </Link>
            </>
          ) : (
            <p className="mt-4 text-white/60">No upcoming events are published yet.</p>
          )}
        </aside>
      </section>

      <section id="events" className="py-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">Upcoming</p>
            <h2 className="premium-heading mt-3 text-4xl">Events</h2>
          </div>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="ticket-card glass-card shine min-h-80 w-[82vw] max-w-sm shrink-0 snap-start p-5 sm:w-[360px]">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.12] text-emerald-100">
                  <Ticket size={22} />
                </span>
                <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 font-mono text-xs text-white/70">{event.event_code}</span>
              </div>
              <div className="mt-16">
                <h3 className="premium-heading text-3xl">{event.name}</h3>
                <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                  <CalendarDays size={16} />
                  {new Date(event.start_time).toLocaleString()}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-bold text-white/55">
                    {event.lowestTicketPriceCents === null ? "Tickets soon" : `From ${formatMoney(event.lowestTicketPriceCents, event.currency)}`}
                  </span>
                  <span className="text-sm font-black text-emerald-200">View</span>
                </div>
              </div>
            </Link>
          ))}
          {events.length === 0 && <p className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-white/55">No events yet.</p>}
        </div>
      </section>

      <section id="how-it-works" className="grid gap-3 py-10 md:grid-cols-3">
        {[
          ["1", "Buy your ticket", "Pick an event and secure access before arrival."],
          ["2", "Load your wallet", "Top up once and keep bar payments fast."],
          ["3", "Scan at the venue", "Ticket QR at the door, wallet QR at the bar."],
        ].map(([step, title, description]) => (
          <div key={step} className="glass-card p-5">
            <span className="grid size-10 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.10] font-black text-cyan-100">{step}</span>
            <h3 className="mt-4 text-xl font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
          </div>
        ))}
      </section>
    </PublicShell>
  );
}
