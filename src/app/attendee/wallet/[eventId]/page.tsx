import Link from "next/link";
import { ArrowDownLeft, RotateCcw, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { QrWallet } from "@/components/qr-wallet";
import { getEvent, getTransactions, getWallet } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export default async function WalletPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, wallet, transactions] = await Promise.all([getEvent(eventId), getWallet(eventId), getTransactions(eventId)]);

  if (!event || !wallet) {
    return <AppShell><p>Wallet not found.</p></AppShell>;
  }

  return (
    <AppShell>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section>
          <div className="mb-4 rounded-lg bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-sm text-slate-300">{event.name}</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold">
              <WalletCards size={28} />
              {formatMoney(wallet.balance_cents, event.currency)}
            </h1>
          </div>
          <QrWallet token={wallet.qr_token} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href={`/attendee/topup/${event.id}`} className="rounded-md bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white">
              Add Money
            </Link>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              Request Refund
            </button>
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-9 place-items-center rounded-lg ${transaction.type === "topup" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                    {transaction.type === "topup" ? <ArrowDownLeft size={18} /> : <RotateCcw size={18} />}
                  </span>
                  <div>
                    <p className="font-medium capitalize">{transaction.type}</p>
                    <p className="text-sm text-slate-500">{new Date(transaction.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={transaction.amount_cents >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-slate-950"}>
                  {formatMoney(transaction.amount_cents, event.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
