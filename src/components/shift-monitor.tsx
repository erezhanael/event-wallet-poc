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
    <section className="glass-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-emerald-200" />
          <h2 className="font-black text-white">Bartender Shifts</h2>
        </div>
        <span className="neon-badge border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100">{activeCount} active</span>
      </div>
      <div className="mt-4 space-y-3">
        {shifts.map((shift) => (
          <div key={shift.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-white">{shift.bartender_name}</p>
                <p className="mt-1 break-all text-xs text-white/45">{shift.bartender_email ?? "Email unavailable"}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-bold ${shift.ended_at ? "border-white/10 bg-white/[0.08] text-white/50" : "border-emerald-300/30 bg-emerald-300/[0.12] text-emerald-100"}`}>
                {shift.ended_at ? "Ended" : "Active"}
              </span>
            </div>
            <div className="mt-3 grid gap-1 text-sm text-white/50">
              <span>Started {new Date(shift.started_at).toLocaleString()}</span>
              {shift.ended_at && <span>Ended {new Date(shift.ended_at).toLocaleString()}</span>}
              <span className="font-bold text-cyan-100">Duration {durationLabel(shift.started_at, shift.ended_at)}</span>
            </div>
          </div>
        ))}
        {shifts.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/55">No shift activity yet.</p>}
      </div>
    </section>
  );
}
