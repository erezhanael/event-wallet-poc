import { AppShell } from "@/components/app-shell";
import { getEvent, getTransactions } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export default async function TransactionsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, transactions] = await Promise.all([getEvent(eventId), getTransactions(eventId)]);

  return (
    <AppShell>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Money flow</p>
          <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Transactions</h1>
          <p className="mt-2 text-white/55">{event?.name}</p>
        </div>
        <a href={`/api/export-transactions/${eventId}`} className="neon-button px-4 py-3 text-sm">Export CSV</a>
      </div>
      <section className="glass-card overflow-auto">
        <div className="grid min-w-[680px] grid-cols-[160px_120px_120px_1fr] border-b border-white/10 px-4 py-3 text-sm font-bold text-white/45">
          <span>Time</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Wallet</span>
        </div>
        {transactions.map((transaction) => (
          <div key={transaction.id} className="grid min-w-[680px] grid-cols-[160px_120px_120px_1fr] border-b border-white/5 px-4 py-3 text-sm text-white/70 last:border-0">
            <span>{new Date(transaction.created_at).toLocaleString()}</span>
            <span className="capitalize text-cyan-100">{transaction.type}</span>
            <span className="font-black text-emerald-200">{formatMoney(transaction.amount_cents, event?.currency)}</span>
            <span className="font-mono text-xs text-white/45">{transaction.wallet_id}</span>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
