import { AlertTriangle, Banknote, CheckCircle2, Info, Percent, RotateCcw, TicketCheck, TrendingUp, Users } from "lucide-react";
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
    <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-3 sm:rounded-3xl sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold text-white/55">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-2xl bg-white/10 text-emerald-200 sm:size-9">
          <Icon size={18} />
        </span>
      </div>
      <p className="premium-heading mt-3 text-2xl font-black text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-white/45">{detail}</p>
    </section>
  );
}

function SalesTimelineChart({
  data,
  currency,
  dataMode,
}: {
  data: TicketSalesDashboardData["salesTimeline"];
  currency?: string;
  dataMode: TicketSalesDashboardData["dataMode"];
}) {
  const maxTickets = Math.max(...data.map((point) => point.ticketsSold), 1);
  const milestonePoints = data.filter((point) => point.milestone);

  return (
    <section className="mt-5 min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 sm:rounded-3xl sm:p-4">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-200" />
            <h3 className="font-black text-white">Ticket Sales Over Time</h3>
          </div>
          <p className="mt-1 text-sm text-white/55">
            {dataMode === "mockup"
              ? "Mockup plot: opening rush, post-launch slowdown, and a second peak after the discount round."
              : "Live plot: actual ticket purchases grouped by purchase date."}
          </p>
        </div>
        <div className="w-fit rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-sm font-bold text-cyan-100">
          Peak day: {Math.max(...data.map((point) => point.ticketsSold))} tickets
        </div>
      </div>

      <div className="max-w-full overflow-x-auto pb-2">
        <div className="grid min-w-[680px] grid-cols-12 gap-2 border-b border-white/10 pb-3 sm:min-w-[780px] sm:gap-3">
          {data.map((point) => {
            const height = Math.max(18, (point.ticketsSold / maxTickets) * 132);
            const isMilestone = Boolean(point.milestone);

            return (
              <div key={point.date} className="grid min-w-0 grid-rows-[42px_148px_18px_18px] items-end justify-items-center gap-1">
                <div className="flex h-full w-full items-end justify-center">
                  {isMilestone ? (
                    <span className="max-w-full rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/[0.14] px-2 py-1 text-center text-[10px] font-black leading-tight text-fuchsia-50">
                      {point.milestone}
                    </span>
                  ) : null}
                </div>
                <div className="flex h-full w-full items-end justify-center rounded-b-2xl border-b border-white/10">
                  <div
                    className={`w-full max-w-9 rounded-t-2xl sm:max-w-11 ${
                      isMilestone ? "bg-gradient-to-t from-fuchsia-400 via-cyan-300 to-emerald-200 shadow-[0_0_24px_rgba(217,70,239,0.28)]" : "bg-white/20"
                    }`}
                    style={{ height }}
                    aria-label={`${point.label}: ${point.ticketsSold} tickets, ${formatMoney(point.revenueCents, currency)}`}
                  />
                </div>
                <p className="text-xs font-black text-white">{point.ticketsSold}</p>
                <p className="text-[11px] font-bold text-white/45">{point.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-3">
        {milestonePoints.map((point) => (
          <article key={point.date} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">{point.label}</p>
            <p className="mt-1 font-black text-white">{point.milestone}</p>
            <p className="mt-2 text-sm text-white/55">{point.note}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <p className="rounded-xl bg-black/25 p-2 text-white/55">
                Tickets <span className="font-black text-white">{point.ticketsSold}</span>
              </p>
              <p className="rounded-xl bg-black/25 p-2 text-white/55">
                Revenue <span className="font-black text-white">{formatMoney(point.revenueCents, currency)}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TicketSalesDashboard({ metrics, currency }: { metrics: TicketSalesDashboardData; currency?: string }) {
  const sellThrough = percent(metrics.totalSold, metrics.totalCapacity);
  const maxTypeSold = Math.max(...metrics.ticketTypeSales.map((ticketType) => ticketType.soldCount), 1);
  const maxCancellationReason = Math.max(...metrics.cancellationReasons.map((reason) => reason.count), 1);

  return (
    <section className="glass-card min-w-0 overflow-hidden p-3 sm:p-4">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <p className="neon-badge w-fit border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">Ticket sales dashboard</p>
          <h2 className="mt-3 text-2xl font-black text-white">Producer Sales Snapshot</h2>
          <p className="mt-1 text-sm text-white/55">Revenue, ticket mix, coupon usage, sales momentum, and cancellation reasons for the event.</p>
        </div>
        <div className="w-full rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.10] px-4 py-3 sm:w-56 sm:rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/70">Sell-through</p>
          <p className="mt-1 text-2xl font-black text-white">{sellThrough}%</p>
          <div className="mt-2 h-2 w-full rounded-full bg-black/30">
            <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${sellThrough}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-5 flex min-w-0 items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.10] p-3 sm:rounded-3xl sm:p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-300/[0.14] text-amber-100">
          <Info size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-black text-white">{metrics.dataMode === "mockup" ? "Mockup information for producer review" : "Live sales information"}</p>
          <p className="mt-1 text-sm text-white/60">{metrics.headlineNote}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Net ticket sales" value={formatMoney(metrics.netSalesCents, currency)} detail={`${metrics.totalSold} sold of ${metrics.totalCapacity}`} icon={Banknote} />
        <MetricTile label="Average paid" value={formatMoney(metrics.averagePaidCents, currency)} detail="Across active and checked-in tickets" icon={TicketCheck} />
        <MetricTile label="Coupon discount" value={formatMoney(metrics.discountCents, currency)} detail={`${metrics.promoSales.filter((promo) => promo.kind !== "full_price").reduce((sum, promo) => sum + promo.soldCount, 0)} coupon tickets`} icon={Percent} />
        <MetricTile label="Refund exposure" value={formatMoney(metrics.refundExposureCents, currency)} detail={`${metrics.cancelledTickets + metrics.refundedTickets} cancelled or refunded tickets`} icon={RotateCcw} />
      </div>

      <SalesTimelineChart data={metrics.salesTimeline} currency={currency} dataMode={metrics.dataMode} />

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 sm:rounded-3xl sm:p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-black text-white">Sales by Ticket Type</h3>
            <span className="text-sm font-bold text-white/45">{metrics.activeTickets + metrics.checkedInTickets} live tickets</span>
          </div>
          <div className="grid min-w-0 gap-3">
            {metrics.ticketTypeSales.map((ticketType) => {
              const capacityPercent = percent(ticketType.soldCount, ticketType.quantityTotal);
              const barPercent = percent(ticketType.soldCount, maxTypeSold);

              return (
                <article key={ticketType.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
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

        <section className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 sm:rounded-3xl sm:p-4">
          <h3 className="font-black text-white">Coupon Mix</h3>
          <div className="mt-4 grid min-w-0 gap-3">
            {metrics.promoSales.map((promo) => (
              <article key={promo.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
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

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 sm:rounded-3xl sm:p-4">
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

        <section className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 sm:rounded-3xl sm:p-4">
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
