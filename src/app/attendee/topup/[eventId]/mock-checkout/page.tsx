import { AppShell } from "@/components/app-shell";
import { MockPaymentForm } from "@/components/mock-payment-form";
import { getEvent } from "@/lib/data";

export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ amountCents?: string }>;
}) {
  const { eventId } = await params;
  const { amountCents } = await searchParams;
  const event = await getEvent(eventId);
  const amount = Number(amountCents ?? 0);

  if (!event || !Number.isInteger(amount) || amount <= 0) {
    return (
      <AppShell>
        <section className="glass-card mx-auto max-w-xl p-6">
          <h1 className="text-2xl font-black text-white">Checkout unavailable</h1>
          <p className="mt-2 text-white/55">Return to the wallet and choose a top-up amount again.</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <MockPaymentForm eventId={eventId} amountCents={amount} currency={event.currency} />
    </AppShell>
  );
}
