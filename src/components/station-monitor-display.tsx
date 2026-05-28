"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, RadioTower, WifiOff } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { EventRecord, PosStation } from "@/lib/types";

type MonitorPayload = {
  attendeeName?: string;
  previousBalanceCents: number;
  purchaseCents: number;
  remainingBalanceCents: number;
  status: "approved" | "declined" | "idle";
  syncStatus?: "local" | "synced" | "pending";
  updatedAt?: string;
};

export function StationMonitorDisplay({ event, station }: { event: EventRecord; station: PosStation }) {
  const storageKey = `station-monitor-last-${station.id}`;
  const [payload, setPayload] = useState<MonitorPayload | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as MonitorPayload;
    } catch {
      return null;
    }
  });
  const [lastSignalAt, setLastSignalAt] = useState<string | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(`station-monitor:${station.id}`);
    channel.onmessage = (message) => {
      setPayload(message.data as MonitorPayload);
      setLastSignalAt(new Date().toISOString());
    };
    return () => channel.close();
  }, [station.id]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        setPayload(JSON.parse(event.newValue) as MonitorPayload);
        setLastSignalAt(new Date().toISOString());
      } catch {
        setPayload(null);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey]);

  const isIdle = !payload;
  const statusLabel = isIdle ? "Ready" : payload.status === "approved" ? "Approved" : "Declined";
  const signalLabel = useMemo(() => {
    if (lastSignalAt) return `Updated ${new Date(lastSignalAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return "Waiting for POS";
  }, [lastSignalAt]);

  return (
    <main className="min-h-screen bg-[#020403] text-white">
      <div className="flex min-h-screen flex-col p-6 sm:p-8 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
          <div>
            <p className="text-base font-black uppercase tracking-[0.22em] text-emerald-200">{event.name}</p>
            <h1 className="mt-2 text-4xl font-black leading-none sm:text-6xl lg:text-7xl">{station.name}</h1>
          </div>
          <div className="rounded-2xl border border-cyan-300/40 bg-cyan-300/[0.12] px-5 py-3 text-right">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100/70">Pair Code</p>
            <p className="font-mono text-4xl font-black text-cyan-50 sm:text-5xl">{station.pairing_code}</p>
          </div>
        </header>

        <section className="grid flex-1 content-center gap-5 py-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid content-center rounded-[2rem] border border-white/15 bg-white/[0.06] p-6 shadow-[0_0_70px_rgba(56,255,156,0.12)]">
            <div className="flex items-center gap-3 text-emerald-100">
              {isIdle ? <RadioTower size={34} /> : <CheckCircle size={34} />}
              <p className="text-3xl font-black sm:text-5xl">{statusLabel}</p>
            </div>
            <p className="mt-5 text-2xl font-bold text-white/70 sm:text-4xl">
              {isIdle ? "Waiting for a purchase." : `${payload.attendeeName ?? "Guest"} balance updated`}
            </p>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-relaxed text-white/55 sm:text-2xl">Ready for the next guest.</p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-emerald-300/35 bg-emerald-300/[0.12] p-6">
              <p className="text-lg font-black uppercase tracking-[0.18em] text-emerald-100/70">Remaining Balance</p>
              <p className="mt-3 font-mono text-7xl font-black leading-none text-emerald-50 sm:text-8xl lg:text-9xl">
                {payload ? formatMoney(payload.remainingBalanceCents, event.currency) : "--"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/15 bg-white/[0.07] p-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Before</p>
                <p className="mt-2 font-mono text-4xl font-black text-white sm:text-5xl">
                  {payload ? formatMoney(payload.previousBalanceCents, event.currency) : "--"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-red-300/25 bg-red-300/[0.10] p-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-red-100/60">Purchase</p>
                <p className="mt-2 font-mono text-4xl font-black text-red-50 sm:text-5xl">
                  {payload ? `-${formatMoney(payload.purchaseCents, event.currency)}` : "--"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5">
          <div className="flex items-center gap-3 text-white/65">
            <WifiOff size={22} className={!payload || payload.syncStatus === "local" ? "text-amber-200" : "text-emerald-200"} />
            <span className="text-lg font-bold">{!payload || payload.syncStatus === "local" ? "Local offline ledger" : "Cloud synced"}</span>
          </div>
          <p className="text-lg font-bold text-white/55">{signalLabel}</p>
        </footer>
      </div>
    </main>
  );
}
