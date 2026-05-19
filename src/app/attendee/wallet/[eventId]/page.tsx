import Link from "next/link";
import { ArrowDownLeft, ChartNoAxesColumnIncreasing, RotateCcw, Sparkles, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MotionPanel, TapMotion } from "@/components/motion-primitives";
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
      <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
        <section>
          <MotionPanel className="glass-card shine mb-4 overflow-hidden p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">VIP Wallet</p>
                <p className="mt-2 text-sm text-white/60">{event.name}</p>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-white/[0.08] text-emerald-200 shadow-[0_0_32px_rgba(34,197,94,0.32)]">
                <WalletCards size={24} />
              </span>
            </div>
            <h1 className="mt-8 text-5xl font-black tracking-tight sm:text-6xl">
              {formatMoney(wallet.balance_cents, event.currency)}
            </h1>
            <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
              <span className="neon-badge justify-center border-emerald-300/30 bg-emerald-300/[0.12] text-emerald-100">Ready</span>
              <span className="neon-badge justify-center border-fuchsia-300/30 bg-fuchsia-300/[0.12] text-fuchsia-100">VIP</span>
              <span className="neon-badge justify-center border-cyan-300/30 bg-cyan-300/[0.12] text-cyan-100">Level 04</span>
            </div>
          </MotionPanel>
          <QrWallet token={wallet.qr_token} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <TapMotion>
              <Link href={`/attendee/topup/${event.id}`} className="neon-button flex h-12 items-center justify-center px-4 text-center text-sm">
                Add Money
              </Link>
            </TapMotion>
            <button className="h-12 rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-white/80 backdrop-blur hover:border-fuchsia-300/40 hover:text-white">
              Refund
            </button>
          </div>
        </section>
        <section className="glass-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">
                <Sparkles size={13} />
                Live ledger
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Transaction History</h2>
            </div>
            <ChartNoAxesColumnIncreasing className="text-emerald-200" />
          </div>
          <div className="mt-5 space-y-3">
            {transactions.map((transaction) => (
              <MotionPanel key={transaction.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-11 place-items-center rounded-2xl ${transaction.type === "topup" ? "bg-emerald-300/[0.14] text-emerald-100 shadow-[0_0_28px_rgba(34,197,94,0.2)]" : "bg-fuchsia-300/[0.12] text-fuchsia-100"}`}>
                    {transaction.type === "topup" ? <ArrowDownLeft size={18} /> : <RotateCcw size={18} />}
                  </span>
                  <div>
                    <p className="font-semibold capitalize text-white">{transaction.type}</p>
                    <p className="text-sm text-white/45">{new Date(transaction.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={transaction.amount_cents >= 0 ? "font-black text-emerald-200" : "font-black text-white"}>
                  {formatMoney(transaction.amount_cents, event.currency)}
                </span>
              </MotionPanel>
            ))}
            {transactions.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-white/55">No wallet movement yet.</p>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
