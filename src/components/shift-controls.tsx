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
    <section className="glass-card-soft mb-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-emerald-200" />
            <h2 className="font-black text-white">Shift</h2>
          </div>
          <p className="mt-1 text-sm text-white/55">
            {shift ? `Started ${new Date(shift.started_at).toLocaleString()} (${elapsed})` : message}
          </p>
        </div>
        {shift ? (
          <button
            type="button"
            onClick={() => updateShift("end")}
            disabled={isSaving}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-300/30 bg-red-300/[0.10] px-4 text-sm font-bold text-red-100 hover:border-red-300/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={17} />
            End Shift
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateShift("start")}
            disabled={isSaving}
            className="neon-button flex h-11 items-center justify-center gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={17} />
            Start Shift
          </button>
        )}
      </div>
      {shift && <p className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.10] p-3 text-sm text-emerald-100">{message}</p>}
    </section>
  );
}
