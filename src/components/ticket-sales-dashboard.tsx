import { AlertTriangle, Banknote, CheckCircle2, Percent, RotateCcw, TicketCheck, Users } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { TicketSalesDashboard as TicketSalesDashboardData } from "@/lib/types";

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function compactPercent(value: number, total: number) {
  return `${percent(value, total)}%`;
}

function describePromoKind(kind: TicketSalesDashboardData["promoSales"][number]["kind"]) {
  if (kind === "full_price") return "No coupon";
  if (kind === "free") return "Free";
  if (kind === "fixed") return "Amount off";
  return "Percent off";
}

function MetricTile({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Banknote }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/55">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/10 text-emerald-200">
          <Icon size={18} />
        </span>
      </div>
      <p className="premium-heading mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-white/45">{detail}</p>
    </section>
  );
}

export function TicketSalesDashboard({ metrics, currency }: { metrics: TicketSalesDashboardData; currency?: string }) {
  const sellThrough = percent(metrics.totalSold, metrics.totalCapacity);
  const maxTypeSold = Math.max(...metrics.ticketTypeSales.map((ticketType) => ticketType.soldCount), 1);
  const maxCancellationReason = Math.max(...metrics.cancellationReasons.map((reason) => reason.count), 1);

  return (
    <section className="glass-card p-4">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Ticket sales dashboard</p>
          <h2 className="mt-3 text-2xl font-black text-white">Producer Sales Snapshot</h2>
          <p className="mt-1 text-sm text-white/55">Revenue, ticket mix, coupon usage, and cancellation reasons for the event.</p>
        </div>
        <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/70">Sell-through</p>
          <p className="mt-1 text-2xl font-black text-white">{sellThrough}%</p>
          <div className="mt-2 h-2 w-48 max-w-full rounded-full bg-black/30">
            <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${sellThrough}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Net ticket sales" value={formatMoney(metrics.netSalesCents, currency)} detail={`${metrics.totalSold} sold of ${metrics.totalCapacity}`} icon={Banknote} />
        <MetricTile label="Average paid" value={formatMoney(metrics.averagePaidCents, currency)} detail="Across active and checked-in tickets" icon={TicketCheck} />
        <MetricTile label="Coupon discount" value={formatMoney(metrics.discountCents, currency)} detail={`${metrics.promoSales.filter((promo) => promo.kind !== "full_price").reduce((sum, promo) => sum + promo.soldCount, 0)} coupon tickets`} icon={Percent} />
        <MetricTile label="Refund exposure" value={formatMoney(metrics.refundExposureCents, currency)} detail={`${metrics.cancelledTickets + metrics.refundedTickets} cancelled or refunded tickets`} icon={RotateCcw} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-black text-white">Sales by Ticket Type</h3>
            <span className="text-sm font-bold text-white/45">{metrics.activeTickets + metrics.checkedInTickets} live tickets</span>
          </div>
          <div className="grid gap-3">
            {metrics.ticketTypeSales.map((ticketType) => {
              const capacityPercent = percent(ticketType.soldCount, ticketType.quantityTotal);
              const barPercent = percent(ticketType.soldCount, maxTypeSold);

              return (
                <article key={ticketType.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_160px_130px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-white">{ticketType.name}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-xs font-bold text-white/50">{capacityPercent}% sold</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-black/35">
                        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300" style={{ width: `${barPercent}%` }} />
                      </div>
                    </div>
                    <div className="text-sm text-white/55">
                      <p>
                        <span className="font-black text-white">{ticketType.soldCount}</span> / {ticketType.quantityTotal} sold
                      </p>
                      <p>{ticketType.promoCount} coupon or comp</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-black text-emerald-200">{formatMoney(ticketType.revenueCents, currency)}</p>
                      <p className="text-xs text-white/45">{formatMoney(ticketType.discountCents, currency)} discounted</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <h3 className="font-black text-white">Coupon Mix</h3>
          <div className="mt-4 grid gap-3">
            {metrics.promoSales.map((promo) => (
              <article key={promo.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-black text-white">{promo.code}</p>
                    <p className="mt-1 text-xs font-bold text-white/45">{describePromoKind(promo.kind)}</p>
                  </div>
                  <p className="text-right text-sm font-black text-emerald-200">{formatMoney(promo.revenueCents, currency)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-white/55">
                  <p className="rounded-xl bg-black/25 p-2">
                    Sold <span className="font-black text-white">{promo.soldCount}</span>
                  </p>
                  <p className="rounded-xl bg-black/25 p-2">
                    Off <span className="font-black text-white">{formatMoney(promo.discountCents, currency)}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-200" />
            <h3 className="font-black text-white">Cancellations by Reason</h3>
          </div>
          <div className="grid gap-3">
            {metrics.cancellationReasons.map((reason) => (
              <div key={reason.reason} className="grid gap-2 sm:grid-cols-[140px_1fr_110px] sm:items-center">
                <p className="text-sm font-bold text-white/70">{reason.reason}</p>
                <div className="h-9 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                  <div className="flex h-7 items-center rounded-xl bg-amber-300/25 px-3 text-xs font-black text-amber-50" style={{ width: `${Math.max(12, percent(reason.count, maxCancellationReason))}%` }}>
                    {reason.count}
                  </div>
                </div>
                <p className="text-sm font-black text-white sm:text-right">{formatMoney(reason.refundCents, currency)}</p>
              </div>
            ))}
            {metrics.cancellationReasons.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/55">No cancellation requests yet.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Users size={18} className="text-cyan-200" />
            <h3 className="font-black text-white">Request Status</h3>
          </div>
          <div className="grid gap-3">
            {metrics.cancellationStatuses.map((status) => (
              <div key={status.status} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-200" />
                  <p className="font-bold capitalize text-white/70">{status.status}</p>
                </div>
                <p className="text-xl font-black text-white">{status.count}</p>
              </div>
            ))}
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/55">
              Gross before discounts: <span className="font-black text-white">{formatMoney(metrics.grossSalesCents, currency)}</span>
            </p>
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/55">
              Checked in: <span className="font-black text-white">{metrics.checkedInTickets}</span> ({compactPercent(metrics.checkedInTickets, metrics.totalSold)})
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
