import { Clock } from "lucide-react";
import type { BartenderShiftSummary } from "@/lib/types";

function durationLabel(startedAt: string, endedAt?: string | null) {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const start = new Date(startedAt).getTime();
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function ShiftMonitor({ shifts }: { shifts: BartenderShiftSummary[] }) {
  const activeCount = shifts.filter((shift) => !shift.ended_at).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-emerald-700" />
          <h2 className="font-semibold">Bartender Shifts</h2>
        </div>
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{activeCount} active</span>
      </div>
      <div className="mt-4 space-y-3">
        {shifts.map((shift) => (
          <div key={shift.id} className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{shift.bartender_name}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{shift.bartender_email ?? "Email unavailable"}</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${shift.ended_at ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}>
                {shift.ended_at ? "Ended" : "Active"}
              </span>
            </div>
            <div className="mt-3 grid gap-1 text-sm text-slate-600">
              <span>Started {new Date(shift.started_at).toLocaleString()}</span>
              {shift.ended_at && <span>Ended {new Date(shift.ended_at).toLocaleString()}</span>}
              <span className="font-medium text-slate-950">Duration {durationLabel(shift.started_at, shift.ended_at)}</span>
            </div>
          </div>
        ))}
        {shifts.length === 0 && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">No shift activity yet.</p>}
      </div>
    </section>
  );
}
