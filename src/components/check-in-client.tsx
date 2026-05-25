"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, CreditCard, Nfc, Search, ShieldAlert, TicketCheck, WifiOff, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";

type LoadedTicket = {
  ticket?: { ticket_token: string; status: string; checked_in_at?: string | null; attendee_id?: string; ticket_type?: { name?: string } };
  attendee?: { id: string; full_name: string };
  wallet?: { id: string; balance_cents: number; status: string };
  checkin?: { checked_in?: boolean; nfc_tag_uid?: string | null; nfc_status?: string | null };
};

type NfcReader = {
  scan: () => Promise<void>;
  write: (message: string) => Promise<void>;
  onreading: ((event: { serialNumber?: string }) => void) | null;
  onreadingerror: (() => void) | null;
};

const queueKey = "event-wallet-checkin-queue";

export function CheckInClient({ eventId }: { eventId: string }) {
  const [ticketToken, setTicketToken] = useState("");
  const [tagUid, setTagUid] = useState("");
  const [loaded, setLoaded] = useState<LoadedTicket | null>(null);
  const [message, setMessage] = useState("Scan or enter a ticket token to begin.");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator === "undefined" ? false : !navigator.onLine));

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const deviceId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const existing = window.localStorage.getItem("event-wallet-device-id");
    if (existing) return existing;
    const next = `device_${crypto.randomUUID()}`;
    window.localStorage.setItem("event-wallet-device-id", next);
    return next;
  }, []);

  async function loadTicket() {
    if (!ticketToken.trim()) {
      setStatus("error");
      setMessage("Enter a ticket token.");
      return;
    }

    setIsSaving(true);
    setMessage("Loading ticket...");

    try {
      const response = await fetch("/api/check-in/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketToken }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setLoaded(null);
        setStatus("error");
        setMessage(payload.error ?? "Ticket invalid");
        return;
      }

      setLoaded(payload);
      setTagUid(payload.checkin?.nfc_tag_uid ?? "");
      setStatus("success");
      setMessage(payload.ticket?.status === "checked_in" ? "Ticket already checked in" : "Ticket valid");
    } finally {
      setIsSaving(false);
    }
  }

  async function readNfc() {
    const Reader = (globalThis as typeof globalThis & { NDEFReader?: new () => NfcReader }).NDEFReader;
    if (!Reader) {
      setStatus("error");
      setMessage("Web NFC is not available in this browser. Enter the tag UID manually.");
      return;
    }

    try {
      const reader = new Reader();
      reader.onreading = (event) => {
        setTagUid(event.serialNumber ?? "");
        setStatus("success");
        setMessage("NFC wristband read.");
      };
      reader.onreadingerror = () => {
        setStatus("error");
        setMessage("Could not read NFC wristband.");
      };
      await reader.scan();
      setMessage("Tap the NTAG216 wristband.");
    } catch {
      setStatus("error");
      setMessage("NFC permission was blocked or unsupported. Enter UID manually.");
    }
  }

  async function writeNfc(walletId: string) {
    const Reader = (globalThis as typeof globalThis & { NDEFReader?: new () => NfcReader }).NDEFReader;
    if (!Reader) return;
    const reader = new Reader();
    await reader.write(`event-wallet:${walletId}`);
  }

  function queueOfflineAssignment(replace: boolean) {
    const current = JSON.parse(window.localStorage.getItem(queueKey) ?? "[]") as Array<Record<string, unknown>>;
    current.push({
      eventId,
      ticketToken,
      tagUid,
      replace,
      deviceId,
      timestamp: new Date().toISOString(),
      sync_status: "pending",
    });
    window.localStorage.setItem(queueKey, JSON.stringify(current));
    setStatus("success");
    setMessage("Offline mode: assignment saved locally");
  }

  async function assignWristband(replace = false) {
    if (!loaded?.wallet?.id || !ticketToken.trim() || !tagUid.trim()) {
      setStatus("error");
      setMessage("Load a ticket and scan or enter a wristband UID first.");
      return;
    }

    if (isOffline) {
      queueOfflineAssignment(replace);
      return;
    }

    setIsSaving(true);
    setMessage(replace ? "Replacing wristband..." : "Assigning wristband...");

    try {
      const response = await fetch("/api/check-in/assign-nfc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketToken, tagUid, replace, deviceId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error ?? "This wristband is already assigned");
        return;
      }

      await writeNfc(payload.wallet_id);
      setStatus("success");
      setMessage("Wristband assigned successfully. Wallet activated.");
      await loadTicket();
    } finally {
      setIsSaving(false);
    }
  }

  async function markTag(action: "lost" | "blocked") {
    if (!tagUid.trim()) {
      setStatus("error");
      setMessage("Enter a tag UID first.");
      return;
    }

    const response = await fetch("/api/check-in/tag-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, tagUid, action, deviceId }),
    });
    const payload = await response.json();
    setStatus(response.ok ? "success" : "error");
    setMessage(response.ok ? `This wristband is ${action}` : payload.error ?? "Could not update wristband");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section className="glass-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Arrival desk</p>
            <h2 className="mt-3 text-2xl font-black text-white">Ticket + NFC Check-In</h2>
          </div>
          {isOffline ? <WifiOff className="text-amber-200" /> : <TicketCheck className="text-emerald-200" />}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
            <Search size={18} className="text-cyan-200" />
            <input
              value={ticketToken}
              onChange={(event) => setTicketToken(event.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/35"
              placeholder="ticket token, name, phone, or ticket id"
            />
          </label>
          <button type="button" onClick={loadTicket} disabled={isSaving} className="neon-button h-12 px-5 text-sm disabled:opacity-50">
            Scan Ticket QR
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
            <Nfc size={18} className="text-emerald-200" />
            <input
              value={tagUid}
              onChange={(event) => setTagUid(event.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/35"
              placeholder="NTAG216 UID"
            />
          </label>
          <button type="button" onClick={readNfc} className="h-12 rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white/75">
            Scan NFC
          </button>
        </div>

        <div className={`mt-4 rounded-3xl border p-4 text-sm font-semibold ${status === "error" ? "border-red-300/30 bg-red-300/[0.12] text-red-100" : "border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100"}`}>
          <div className="flex items-center gap-2">
            {status === "error" ? <XCircle size={18} /> : <CheckCircle size={18} />}
            {message}
          </div>
        </div>
      </section>

      <aside className="glass-card h-fit p-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">Attendee</p>
        {loaded ? (
          <>
            <h3 className="mt-3 text-2xl font-black text-white">{loaded.attendee?.full_name ?? "Attendee"}</h3>
            <p className="mt-1 text-sm text-white/50">{loaded.ticket?.ticket_type?.name ?? "Ticket"}</p>
            <div className="mt-4 grid gap-2">
              <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70">Ticket: {loaded.ticket?.status}</p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70">Check-in: {loaded.checkin?.checked_in ? "Checked in" : "Not checked in"}</p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70">NFC: {loaded.checkin?.nfc_status ?? "Unassigned"}</p>
              <p className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.10] p-3 text-sm font-black text-emerald-100">
                <CreditCard size={16} />
                {formatMoney(loaded.wallet?.balance_cents ?? 0)}
              </p>
            </div>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => assignWristband(false)} disabled={isSaving} className="neon-button h-12 px-4 text-sm disabled:opacity-50">
                Assign NFC Wristband
              </button>
              <button type="button" onClick={() => assignWristband(true)} disabled={isSaving} className="h-12 rounded-2xl border border-amber-300/30 bg-amber-300/[0.10] px-4 text-sm font-black text-amber-100 disabled:opacity-50">
                Replace Wristband
              </button>
              <button type="button" onClick={() => markTag("blocked")} className="h-12 rounded-2xl border border-red-300/30 bg-red-300/[0.10] px-4 text-sm font-black text-red-100">
                <span className="inline-flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Mark Lost / Blocked
                </span>
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/55">No ticket loaded.</p>
        )}
      </aside>
    </div>
  );
}
