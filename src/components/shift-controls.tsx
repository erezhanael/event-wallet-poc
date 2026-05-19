"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import type { BartenderShift } from "@/lib/types";

function durationLabel(startedAt: string, endedAt?: string | null, currentTime?: number | null) {
  const end = endedAt ? new Date(endedAt).getTime() : currentTime ?? new Date(startedAt).getTime();
  const start = new Date(startedAt).getTime();
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function ShiftControls({ eventId, initialShift }: { eventId: string; initialShift: BartenderShift | null }) {
  const [shift, setShift] = useState(initialShift);
  const [message, setMessage] = useState(initialShift ? "Shift is active." : "Start your shift before serving.");
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!shift) return;
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 0);
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [shift]);

  const elapsed = useMemo(() => (shift ? durationLabel(shift.started_at, null, now) : null), [shift, now]);

  async function updateShift(action: "start" | "end") {
    setIsSaving(true);
    setMessage(action === "start" ? "Starting shift..." : "Ending shift...");

    try {
      const response = await fetch(`/api/events/${eventId}/shifts/${action}`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not update shift.");
        return;
      }

      if (action === "start") {
        setShift(payload);
        setNow(Date.now());
        setMessage("Shift started.");
      } else {
        setShift(null);
        setNow(null);
        setMessage(`Shift ended. Duration ${durationLabel(payload.started_at, payload.ended_at)}.`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-emerald-700" />
            <h2 className="font-semibold">Shift</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {shift ? `Started ${new Date(shift.started_at).toLocaleString()} (${elapsed})` : message}
          </p>
        </div>
        {shift ? (
          <button
            type="button"
            onClick={() => updateShift("end")}
            disabled={isSaving}
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <LogOut size={17} />
            End Shift
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateShift("start")}
            disabled={isSaving}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <LogIn size={17} />
            Start Shift
          </button>
        )}
      </div>
      {shift && <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    </section>
  );
}
