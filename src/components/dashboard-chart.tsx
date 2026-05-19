import { formatMoney } from "@/lib/money";
import type { DashboardMetrics } from "@/lib/types";

export function DashboardChart({ data }: { data: DashboardMetrics["hourlySales"] }) {
  const max = Math.max(...data.map((row) => row.salesCents), 1);

  return (
    <div className="glass-card h-72 rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black text-white">Hourly Sales</h2>
        <span className="neon-badge rounded-full px-2 py-1 text-xs font-bold">Live pulse</span>
      </div>
      <div className="flex h-[210px] items-end gap-3">
        {data.map((row) => (
          <div key={row.hour} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end rounded-2xl border border-white/10 bg-black/25 px-1">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-emerald-400 via-cyan-300 to-pink-300 shadow-[0_0_20px_rgba(56,255,156,0.25)]"
                style={{ height: `${Math.max(8, (row.salesCents / max) * 100)}%` }}
                title={formatMoney(row.salesCents)}
              />
            </div>
            <span className="text-xs font-semibold text-white/50">{row.hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
