import { AppShell } from "@/components/app-shell";
import { getEvent, getWallet } from "@/lib/data";
import { formatMoney } from "@/lib/money";

const amounts = [5000, 10000, 15000, 25000];

export default async function TopupPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, wallet] = await Promise.all([getEvent(eventId), getWallet(eventId)]);

  return (
    <AppShell>
      <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Add Money</h1>
        <p className="mt-2 text-slate-600">Stripe Checkout test mode creates a payment attempt. The webhook confirms top-ups.</p>
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Current balance</p>
          <p className="text-3xl font-semibold">{formatMoney(wallet?.balance_cents ?? 0, event?.currency)}</p>
        </div>
        <form action="/api/stripe/create-checkout-session" method="POST" className="mt-5 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="walletId" value={wallet?.id} />
          {amounts.map((amount) => (
            <button key={amount} name="amountCents" value={amount} className="h-20 rounded-lg border border-slate-200 bg-slate-50 text-lg font-semibold hover:border-emerald-500">
              {formatMoney(amount, event?.currency)}
            </button>
          ))}
        </form>
      </section>
    </AppShell>
  );
}
