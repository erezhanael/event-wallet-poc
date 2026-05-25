import Link from "next/link";
import { CalendarDays, CreditCard, QrCode, Ticket, Users } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { getEvent, getTicketTypes } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PublicEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, ticketTypes] = await Promise.all([getEvent(eventId), getTicketTypes(eventId).catch(() => [])]);

  if (!event) {
    return (
      <PublicShell>
        <section className="glass-card mx-auto max-w-xl p-6">
          <h1 className="text-2xl font-black text-white">Event not found</h1>
          <Link href="/" className="mt-4 inline-flex text-sm font-bold text-cyan-100">
            Back to events
          </Link>
        </section>
      </PublicShell>
    );
  }

  const attendeeTicketPath = `/attendee/events/${event.id}/tickets`;
  const attendeeLoginHref = `/login?next=${encodeURIComponent(attendeeTicketPath)}`;
  const attendeeRegisterHref = `/register?eventId=${encodeURIComponent(event.id)}&next=${encodeURIComponent(attendeeTicketPath)}`;

  return (
    <PublicShell>
      <section className="grid gap-6 py-8 lg:grid-cols-[1fr_390px]">
        <div>
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Public event</p>
          <h1 className="premium-heading mt-4 max-w-3xl text-5xl sm:text-7xl">{event.name}</h1>
          <div className="mt-6 grid gap-3 text-white/65 sm:grid-cols-2">
            <p className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <CalendarDays size={17} className="text-cyan-200" />
              {new Date(event.start_time).toLocaleString()}
            </p>
            <p className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <Users size={17} className="text-fuchsia-200" />
              Code {event.event_code}
            </p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Ticket, title: "Ticket access", body: "Buy or claim an event ticket." },
              { icon: CreditCard, title: "Wallet top-up", body: "Preload balance for bar payments." },
              { icon: QrCode, title: "QR entry", body: "Show ticket QR at check-in." },
            ].map((item) => (
              <div key={item.title} className="glass-card p-4">
                <item.icon size={20} className="text-emerald-200" />
                <h3 className="mt-3 font-black text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-white/50">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="glass-card shine h-fit p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Tickets</p>
          <div className="mt-4 space-y-3">
            {ticketTypes.map((ticketType) => {
              const remaining = Math.max(0, ticketType.quantity_total - ticketType.quantity_sold);

              return (
                <div key={ticketType.id} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-black text-white">{ticketType.name}</h2>
                      <p className="mt-1 text-sm text-white/45">{ticketType.description ?? "Event access ticket"}</p>
                    </div>
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.10] px-3 py-1 text-sm font-black text-emerald-100">
                      {formatMoney(ticketType.price_cents, event.currency)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-white/45">{remaining} remaining</p>
                </div>
              );
            })}
            {ticketTypes.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-white/55">Tickets are coming soon.</p>}
          </div>
          <Link href={attendeeRegisterHref} className="neon-button mt-5 flex h-12 items-center justify-center px-4 text-sm">
            Get Ticket
          </Link>
          <Link href={attendeeLoginHref} className="mt-3 flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm font-black text-white/75 hover:bg-white/[0.12]">
            Already have an account?
          </Link>
        </aside>
      </section>
    </PublicShell>
  );
}
