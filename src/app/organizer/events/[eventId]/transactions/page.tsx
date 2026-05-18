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
          <h1 className="text-3xl font-semibold">Transactions</h1>
          <p className="mt-2 text-slate-600">{event?.name}</p>
        </div>
        <a href={`/api/export-transactions/${eventId}`} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Export CSV</a>
      </div>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-[680px] grid-cols-[160px_120px_120px_1fr] border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
          <span>Time</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Wallet</span>
        </div>
        {transactions.map((transaction) => (
          <div key={transaction.id} className="grid min-w-[680px] grid-cols-[160px_120px_120px_1fr] px-4 py-3 text-sm">
            <span>{new Date(transaction.created_at).toLocaleString()}</span>
            <span className="capitalize">{transaction.type}</span>
            <span className="font-semibold">{formatMoney(transaction.amount_cents, event?.currency)}</span>
            <span className="font-mono text-xs">{transaction.wallet_id}</span>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
