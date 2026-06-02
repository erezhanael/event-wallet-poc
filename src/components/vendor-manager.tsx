"use client";

import Link from "next/link";
import { Copy, Store, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EventVendor, PosStation } from "@/lib/types";

const stationTypes: Array<{ value: PosStation["station_type"]; label: string }> = [
  { value: "food", label: "Food" },
  { value: "merch", label: "Merch" },
  { value: "bar", label: "Bar" },
  { value: "other", label: "Other" },
];

export function VendorManager({ eventId, initialVendors }: { eventId: string; initialVendors: EventVendor[] }) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [email, setEmail] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [stationName, setStationName] = useState("");
  const [stationType, setStationType] = useState<PosStation["station_type"]>("food");
  const [message, setMessage] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function addVendor() {
    setTemporaryPassword(null);
    if (!email.trim() || !vendorName.trim()) {
      setMessage("Enter vendor name and email.");
      return;
    }

    setIsSaving(true);
    setMessage("Inviting vendor...");

    try {
      const response = await fetch(`/api/events/${eventId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, vendorName, stationName: stationName || vendorName, stationType }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not invite vendor.");
        return;
      }

      setVendors((current) => [payload.vendor, ...current.filter((vendor) => vendor.user_id !== payload.vendor.user_id)]);
      setEmail("");
      setVendorName("");
      setStationName("");
      setStationType("food");
      setTemporaryPassword(payload.temporaryPassword ?? null);
      setMessage(payload.createdUser ? "Vendor user created, station assigned, and invite ready." : "Vendor assigned and station updated.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function copyVendor(vendor: EventVendor) {
    const monitorUrl = vendor.monitor_slug ? `${origin}/monitor/${eventId}/${vendor.monitor_slug}` : "No monitor assigned";
    const vendorWorkspaceUrl = `${origin}/login?next=${encodeURIComponent(`/vendor/events/${eventId}`)}`;
    await navigator.clipboard.writeText(
      `Vendor: ${vendor.vendor_name}\nEmail: ${vendor.email ?? ""}\nLogin: ${vendorWorkspaceUrl}\nStation: ${vendor.station_name ?? ""}\nPairing code: ${vendor.pairing_code ?? ""}\nMonitor: ${monitorUrl}`,
    );
    setMessage("Vendor details copied.");
  }

  async function copyPassword() {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setMessage("Temporary password copied.");
  }

  return (
    <section className="glass-card p-5">
      <Store className="text-cyan-200" />
      <h2 className="mt-4 text-lg font-black text-white">Invite Vendors</h2>
      <p className="mt-2 text-sm text-white/55">
        Vendors get their own menu, station monitor, and POS access for charging attendee wallets.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_150px_auto]">
        <label className="text-sm font-semibold text-white/70">
          Vendor name
          <input
            value={vendorName}
            onChange={(event) => setVendorName(event.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
            placeholder="Taco Truck"
          />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
            placeholder="vendor@example.com"
          />
        </label>
        <label className="text-sm font-semibold text-white/70">
          Station name
          <input
            value={stationName}
            onChange={(event) => setStationName(event.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
            placeholder="Defaults to vendor name"
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
          onClick={addVendor}
          disabled={isSaving}
          className="neon-button flex h-11 items-center justify-center gap-2 self-end px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus size={17} />
          Invite
        </button>
      </div>

      {message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/60">{message}</p>}
      {temporaryPassword && (
        <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.10] p-3">
          <p className="text-sm font-bold text-amber-100">Temporary password</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-black/35 px-2 py-2 text-sm text-white">{temporaryPassword}</code>
            <button
              type="button"
              onClick={copyPassword}
              className="grid size-10 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/[0.12] text-amber-100 hover:border-amber-200/70"
              aria-label="Copy temporary password"
              title="Copy temporary password"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {vendors.map((vendor) => (
          <div key={vendor.user_id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">{vendor.vendor_name}</p>
                <p className="mt-1 break-all text-white/45">{vendor.email ?? "Email unavailable"}</p>
              </div>
              <button
                type="button"
                onClick={() => copyVendor(vendor)}
                className="grid size-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/[0.12] text-cyan-100 hover:border-cyan-200/70"
                aria-label={`Copy ${vendor.vendor_name} details`}
                title="Copy vendor details"
              >
                <Copy size={16} />
              </button>
            </div>
            <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] p-3">
              <p className="font-bold text-cyan-100">{vendor.station_name ?? "No station assigned"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{vendor.station_type ?? "station"}</p>
              {vendor.pairing_code && <p className="mt-2 font-mono text-2xl font-black text-cyan-50">{vendor.pairing_code}</p>}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link
                href={`/login?next=${encodeURIComponent(`/vendor/events/${eventId}`)}`}
                target="_blank"
                className="flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-3 font-bold text-white/75 hover:bg-white/[0.12]"
              >
                Vendor Login
              </Link>
              {vendor.monitor_slug && (
                <Link href={`/monitor/${eventId}/${vendor.monitor_slug}`} target="_blank" className="flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-3 font-bold text-white/75 hover:bg-white/[0.12]">
                  Open Monitor
                </Link>
              )}
            </div>
          </div>
        ))}
        {vendors.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/55">No vendors invited yet.</p>}
      </div>
    </section>
  );
}
