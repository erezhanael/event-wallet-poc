import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, CreditCard, QrCode, Sparkles, Ticket, Users } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { getPublicEventSummaries } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const eventPosters = [
  "/invite/neon_rooftop_invetation.png",
  "/invite/summer_party_invetion.png",
  "/invite/luna_invetion.png",
];

function getEventPoster(eventName: string, index = 0) {
  const normalizedName = eventName.toLowerCase();
  if (normalizedName.includes("summer")) return "/invite/summer_party_invetion.png";
  if (normalizedName.includes("neon")) return "/invite/neon_rooftop_invetation.png";
  if (normalizedName.includes("luna")) return "/invite/luna_invetion.png";
  return eventPosters[index % eventPosters.length];
}

export default async function Home() {
  const events = await getPublicEventSummaries();
  const [featuredEvent] = events;
  const featuredPoster = featuredEvent ? getEventPoster(featuredEvent.name) : null;

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

        <aside className="event-poster shine rounded-[2rem] p-5">
          {featuredEvent && featuredPoster && (
            <>
              <Image
                src={featuredPoster}
                alt={`${featuredEvent.name} event poster`}
                fill
                priority
                sizes="(min-width: 1024px) 430px, 100vw"
                className="absolute inset-0 z-0 object-cover"
              />
              <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.26)_38%,rgba(0,0,0,0.88))]" />
            </>
          )}
          <div className="relative z-10 flex items-start justify-between">
            <p className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white/70">Featured</p>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.12] px-3 py-1 text-xs font-black text-emerald-100">Rooftop</span>
          </div>
          {featuredEvent ? (
            <div className="relative z-10 flex min-h-[27rem] flex-col justify-end">
              <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.28em] text-cyan-100">{featuredEvent.event_code}</p>
              <h2 className="premium-heading text-5xl font-black leading-none">{featuredEvent.name}</h2>
              <div className="mt-5 space-y-3 text-sm text-white/72">
                <p className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  {new Date(featuredEvent.start_time).toLocaleString()}
                </p>
                <p className="flex items-center gap-2">
                  <Users size={16} />
                  {featuredEvent.ticketsAvailable} tickets available
                </p>
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-300/25 bg-black/35 p-4 backdrop-blur">
                <p className="text-sm text-emerald-100/70">Tickets from</p>
                <p className="mt-1 text-4xl font-black text-white">
                  {featuredEvent.lowestTicketPriceCents === null ? "Soon" : formatMoney(featuredEvent.lowestTicketPriceCents, featuredEvent.currency)}
                </p>
              </div>
              <Link href={`/events/${featuredEvent.id}`} className="neon-button mt-5 flex h-12 items-center justify-center px-4 text-sm">
                View Tickets
              </Link>
            </div>
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
        <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-6">
          {events.map((event, index) => {
            const poster = getEventPoster(event.name, index);

            return (
              <Link key={event.id} href={`/events/${event.id}`} className="event-poster shine group flex w-[84vw] max-w-[390px] shrink-0 snap-start flex-col justify-between rounded-[2rem] p-5 sm:w-[390px]">
              <Image
                src={poster}
                alt={`${event.name} event poster`}
                fill
                sizes="(min-width: 640px) 390px, 84vw"
                className="absolute inset-0 z-0 object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.20)_28%,rgba(0,0,0,0.90))]" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-black/35 text-emerald-100 backdrop-blur">
                  <Ticket size={22} />
                </span>
                <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 font-mono text-xs text-white/75">{event.event_code}</span>
              </div>

              <div className="relative z-10 mt-14">
                <div className="mb-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-300/[0.12] px-3 py-1 text-xs font-black text-fuchsia-100">Nightlife</span>
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.12] px-3 py-1 text-xs font-black text-cyan-100">Wallet Ready</span>
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-300/[0.12] px-3 py-1 text-xs font-black text-emerald-100">#{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-white/50">Live event</p>
                <h3 className="premium-heading mt-2 text-4xl font-black leading-none">{event.name}</h3>
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/72">
                  <CalendarDays size={16} />
                  {new Date(event.start_time).toLocaleString()}
                </p>
                <div className="mt-6 rounded-3xl border border-white/12 bg-black/35 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Access</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <span className="text-2xl font-black text-white">
                      {event.lowestTicketPriceCents === null ? "Soon" : formatMoney(event.lowestTicketPriceCents, event.currency)}
                    </span>
                    <span className="text-sm font-black text-emerald-200">Tickets</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-white/45">
                    {event.lowestTicketPriceCents === null ? "Tickets soon" : `From ${formatMoney(event.lowestTicketPriceCents, event.currency)}`}
                  </p>
                </div>
                <span className="neon-button mt-4 flex h-11 items-center justify-center rounded-2xl px-4 text-sm">View Event</span>
              </div>
              </Link>
            );
          })}
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
