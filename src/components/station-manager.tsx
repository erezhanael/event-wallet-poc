"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Monitor, Plus, RadioTower } from "lucide-react";
import { useMemo, useState } from "react";
import type { PosStation } from "@/lib/types";

const stationTypes: Array<{ value: PosStation["station_type"]; label: string }> = [
  { value: "bar", label: "Bar" },
  { value: "food", label: "Food" },
  { value: "merch", label: "Merch" },
  { value: "other", label: "Other" },
];

export function StationManager({ eventId, initialStations }: { eventId: string; initialStations: PosStation[] }) {
  const router = useRouter();
  const [stations, setStations] = useState(initialStations);
  const [name, setName] = useState("");
  const [stationType, setStationType] = useState<PosStation["station_type"]>("bar");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function addStation() {
    if (!name.trim()) {
      setMessage("Enter a station name.");
      return;
    }

    setIsSaving(true);
    setMessage("Adding station...");

    try {
      const response = await fetch(`/api/events/${eventId}/stations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stationType }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not add station.");
        return;
      }

      setStations((current) => [payload.station, ...current.filter((station) => station.id !== payload.station.id)]);
      setName("");
      setStationType("bar");
      setMessage("Station added. Open the monitor link on the customer-facing screen.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function copyPairing(station: PosStation) {
    const url = `${origin}/monitor/${eventId}/${station.monitor_slug}`;
    await navigator.clipboard.writeText(`Station: ${station.name}\nPairing code: ${station.pairing_code}\nMonitor: ${url}`);
    setMessage("Pairing details copied.");
  }

  return (
    <section className="glass-card p-5">
      <RadioTower className="text-cyan-200" />
      <h2 className="mt-4 text-lg font-black text-white">Stations + Monitors</h2>
      <p className="mt-2 text-sm text-white/55">
        Create each selling position, then open its monitor link on the customer-facing display.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_auto]">
        <label className="text-sm font-semibold text-white/70">
          Station name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
            placeholder="Main Bar, Food Truck, Merch"
          />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Type
          <select
            value={stationType}
            onChange={(event) => setStationType(event.target.value as PosStation["station_type"])}
            className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
          >
            {stationTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addStation}
          disabled={isSaving}
          className="neon-button flex h-11 items-center justify-center gap-2 self-end px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          Add
        </button>
      </div>

      {message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/60">{message}</p>}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {stations.map((station) => (
          <div key={station.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-white">{station.name}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/40">{station.station_type}</p>
              </div>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/[0.10] px-3 py-1 text-xs font-black text-emerald-100">
                {station.active ? "Active" : "Off"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] p-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/60">Pairing Code</p>
                <p className="mt-1 font-mono text-3xl font-black text-cyan-50">{station.pairing_code}</p>
              </div>
              <button
                type="button"
                onClick={() => copyPairing(station)}
                className="grid size-11 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/[0.12] text-cyan-100 hover:border-cyan-200/70"
                aria-label={`Copy ${station.name} pairing details`}
                title="Copy pairing details"
              >
                <Copy size={17} />
              </button>
            </div>
            <Link
              href={`/monitor/${eventId}/${station.monitor_slug}`}
              target="_blank"
              className="mt-3 flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm font-black text-white/75 hover:bg-white/[0.12]"
            >
              <Monitor size={17} />
              Open Monitor
            </Link>
          </div>
        ))}
        {stations.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/55">
            No stations yet. Add one for each bar, food truck, or merch position.
          </p>
        )}
      </div>
    </section>
  );
}
