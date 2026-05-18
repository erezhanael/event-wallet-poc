import { formatMoney } from "@/lib/money";
import type { DashboardMetrics } from "@/lib/types";

export function DashboardChart({ data }: { data: DashboardMetrics["hourlySales"] }) {
  const max = Math.max(...data.map((row) => row.salesCents), 1);

  return (
    <div className="h-72 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Hourly Sales</h2>
      </div>
      <div className="flex h-[210px] items-end gap-3">
        {data.map((row) => (
          <div key={row.hour} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end rounded-md bg-slate-50 px-1">
              <div
                className="w-full rounded-t bg-emerald-600"
                style={{ height: `${Math.max(8, (row.salesCents / max) * 100)}%` }}
                title={formatMoney(row.salesCents)}
              />
            </div>
            <span className="text-xs font-medium text-slate-500">{row.hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
