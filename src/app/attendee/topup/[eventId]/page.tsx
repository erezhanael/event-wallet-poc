import { AppShell } from "@/components/app-shell";
import { getEvent, getWallet } from "@/lib/data";
import { formatMoney } from "@/lib/money";

const amounts = [5000, 10000, 15000, 25000];

export default async function TopupPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, wallet] = await Promise.all([getEvent(eventId), getWallet(eventId)]);

  return (
    <AppShell>
      <section className="glass-card shine mx-auto max-w-xl p-6">
        <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Wallet top-up</p>
        <h1 className="premium-heading mt-3 text-4xl">Add Money</h1>
        <p className="mt-2 text-white/55">Stripe Checkout test mode creates a payment attempt. The webhook confirms top-ups.</p>
        <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.10] p-4 shadow-[0_0_40px_rgba(34,197,94,0.14)]">
          <p className="text-sm text-emerald-100/70">Current balance</p>
          <p className="text-4xl font-black tracking-tight text-white">{formatMoney(wallet?.balance_cents ?? 0, event?.currency)}</p>
        </div>
        <form action="/api/stripe/create-checkout-session" method="POST" className="mt-5 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="walletId" value={wallet?.id} />
          {amounts.map((amount) => (
            <button key={amount} name="amountCents" value={amount} className="h-20 rounded-3xl border border-white/10 bg-white/[0.06] text-lg font-black text-white hover:border-emerald-300/50 hover:bg-emerald-300/[0.10]">
              {formatMoney(amount, event?.currency)}
            </button>
          ))}
        </form>
      </section>
    </AppShell>
  );
}
