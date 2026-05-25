import Link from "next/link";
import { Ticket } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { RegisterAttendeeForm } from "@/components/register-attendee-form";
import { getEvent } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  const event = eventId ? await getEvent(eventId) : null;

  return (
    <PublicShell>
      <div className="py-8">
        {event ? (
          <>
            <div className="mx-auto mb-5 max-w-md text-center">
              <p className="neon-badge mx-auto w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">
                Ticket access
              </p>
              <h1 className="premium-heading mt-4 text-4xl">{event.name}</h1>
              <p className="mt-2 text-sm text-white/55">New here? Create an attendee account. Already registered? Log in and continue.</p>
            </div>
            <RegisterAttendeeForm eventId={event.id} />
          </>
        ) : (
          <section className="glass-card shine mx-auto max-w-xl p-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.12] text-cyan-100 shadow-[0_0_34px_rgba(103,232,249,0.18)]">
              <Ticket size={24} />
            </span>
            <h1 className="premium-heading mt-5 text-4xl">Choose an Event First</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">
              Registration starts from an event page so the app can send you straight to the right ticket screen.
            </p>
            <Link href="/" className="neon-button mt-6 inline-flex h-12 items-center justify-center px-5 text-sm">
              Browse Events
            </Link>
          </section>
        )}
      </div>
    </PublicShell>
  );
}
