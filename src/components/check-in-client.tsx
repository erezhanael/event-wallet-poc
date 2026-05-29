"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Banknote, Camera, CheckCircle, CreditCard, Nfc, Percent, Search, ShieldAlert, TicketCheck, WifiOff, X, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";

type LoadedTicket = {
  ticket?: { ticket_token: string; status: string; checked_in_at?: string | null; attendee_id?: string; ticket_type?: { name?: string } };
  attendee?: { id: string; full_name: string };
  wallet?: { id: string; balance_cents: number; qr_token?: string; status: string };
  checkin?: { checked_in?: boolean; nfc_tag_uid?: string | null; nfc_status?: string | null };
};

type CashWallet = {
  id: string;
  balance_cents: number;
  qr_token: string;
  status: string;
  attendee_name?: string | null;
  nfc_status?: string | null;
};

type ScanState = "idle" | "starting" | "unsupported" | "error";

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
  const [mode, setMode] = useState<"wristband" | "cash">("wristband");
  const [message, setMessage] = useState("Load a ticket to assign or replace a wristband.");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator === "undefined" ? false : !navigator.onLine));
  const [walletToken, setWalletToken] = useState("");
  const [cashLookupMode, setCashLookupMode] = useState<"nfc" | "qr">("nfc");
  const [cashLookupValue, setCashLookupValue] = useState("");
  const [cashWallet, setCashWallet] = useState<CashWallet | null>(null);
  const [ticketScanState, setTicketScanState] = useState<ScanState>("idle");
  const [ticketScanMessage, setTicketScanMessage] = useState("");
  const [qrScanState, setQrScanState] = useState<ScanState>("idle");
  const [qrScanMessage, setQrScanMessage] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [applyBonus, setApplyBonus] = useState(true);
  const [bonusPercent, setBonusPercent] = useState("10");
  const ticketVideoRef = useRef<HTMLVideoElement>(null);
  const ticketScannerControlsRef = useRef<IScannerControls | null>(null);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const qrScannerControlsRef = useRef<IScannerControls | null>(null);

  const loadTicket = useCallback(
    async (nextTicketToken = ticketToken) => {
      const token = nextTicketToken.trim();
      if (!token) {
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
          body: JSON.stringify({ eventId, ticketToken: token }),
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
        setWalletToken(payload.wallet?.qr_token ?? "");
        setStatus("success");
        setMessage(payload.ticket?.status === "checked_in" ? "Ticket already checked in" : "Ticket valid");
      } finally {
        setIsSaving(false);
      }
    },
    [eventId, ticketToken],
  );

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (mode !== "cash") return;

    const token = cashLookupValue.trim();
    if (!token) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setStatus("idle");
      setMessage(cashLookupMode === "nfc" ? "Looking up wristband wallet..." : "Looking up wallet QR...");

      try {
        const params =
          cashLookupMode === "nfc"
            ? new URLSearchParams({ eventId, tagUid: token })
            : new URLSearchParams({ eventId, walletToken: token });
        const response = await fetch(`/api/wallet?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();

        if (!response.ok) {
          setWalletToken("");
          setCashWallet(null);
          setStatus("error");
          setMessage(
            response.status === 404
              ? cashLookupMode === "nfc"
                ? "No active wallet found for this wristband."
                : "No active wallet found for this QR."
              : payload.error ?? "Could not load wallet.",
          );
          return;
        }

        setWalletToken(payload.qr_token ?? token);
        setCashWallet(payload);
        setStatus("success");
        setMessage("Wallet ready for cash top-up.");
      } catch {
        if (controller.signal.aborted) return;
        setWalletToken("");
        setCashWallet(null);
        setStatus("error");
        setMessage("Could not load wallet.");
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [cashLookupMode, cashLookupValue, eventId, mode]);

  useEffect(() => {
    if (ticketScanState !== "starting") return;

    let isActive = true;

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setTicketScanState("unsupported");
        setTicketScanMessage("Camera access requires browser camera permission and a secure page.");
        return;
      }

      const video = ticketVideoRef.current;
      if (!video) return;

      try {
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          const token = result?.getText().trim();
          if (!token) return;

          setTicketToken(token);
          setTicketScanMessage("Ticket QR scanned.");
          setTicketScanState("idle");
          void loadTicket(token);
        });

        if (!isActive) {
          controls.stop();
          return;
        }

        ticketScannerControlsRef.current = controls;
        setTicketScanMessage("Point the camera at the attendee ticket QR.");
      } catch {
        setTicketScanState("error");
        setTicketScanMessage("Camera permission was blocked or no camera was found. Manual token entry still works.");
      }
    }

    startScanner();

    return () => {
      isActive = false;
      ticketScannerControlsRef.current?.stop();
      ticketScannerControlsRef.current = null;
    };
  }, [loadTicket, ticketScanState]);

  useEffect(() => {
    if (ticketScanState === "starting") return;
    stopTicketCamera();
  }, [ticketScanState]);

  useEffect(() => stopTicketCamera, []);

  useEffect(() => {
    if (qrScanState !== "starting") return;

    let isActive = true;

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setQrScanState("unsupported");
        setQrScanMessage("Camera access requires browser camera permission and a secure page.");
        return;
      }

      const video = qrVideoRef.current;
      if (!video) return;

      try {
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          const token = result?.getText().trim();
          if (!token) return;

          updateCashLookupValue(token);
          setQrScanMessage("Wallet QR scanned.");
          setQrScanState("idle");
        });

        if (!isActive) {
          controls.stop();
          return;
        }

        qrScannerControlsRef.current = controls;
        setQrScanMessage("Point the camera at the attendee wallet QR.");
      } catch {
        setQrScanState("error");
        setQrScanMessage("Camera permission was blocked or no camera was found. Manual token entry still works.");
      }
    }

    startScanner();

    return () => {
      isActive = false;
      qrScannerControlsRef.current?.stop();
      qrScannerControlsRef.current = null;
    };
  }, [qrScanState]);

  useEffect(() => {
    if (qrScanState === "starting") return;
    stopQrCamera();
  }, [qrScanState]);

  useEffect(() => stopQrCamera, []);

  const deviceId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const existing = window.localStorage.getItem("event-wallet-device-id");
    if (existing) return existing;
    const next = `device_${crypto.randomUUID()}`;
    window.localStorage.setItem("event-wallet-device-id", next);
    return next;
  }, []);

  function updateCashLookupValue(nextValue: string) {
    setCashLookupValue(nextValue);
    if (!nextValue.trim()) {
      setWalletToken("");
      setCashWallet(null);
    }
  }

  function stopTicketCamera() {
    ticketScannerControlsRef.current?.stop();
    ticketScannerControlsRef.current = null;
    if (ticketVideoRef.current) {
      ticketVideoRef.current.srcObject = null;
    }
  }

  function startTicketScan() {
    cancelQrScan();
    setTicketScanState("starting");
    setTicketScanMessage("Starting camera...");
  }

  function cancelTicketScan() {
    setTicketScanState("idle");
    setTicketScanMessage("");
  }

  function stopQrCamera() {
    qrScannerControlsRef.current?.stop();
    qrScannerControlsRef.current = null;
    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }
  }

  function startQrScan() {
    cancelTicketScan();
    setCashLookupMode("qr");
    setQrScanState("starting");
    setQrScanMessage("Starting camera...");
  }

  function cancelQrScan() {
    setQrScanState("idle");
    setQrScanMessage("");
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

  async function readCashNfc() {
    const Reader = (globalThis as typeof globalThis & { NDEFReader?: new () => NfcReader }).NDEFReader;
    if (!Reader) {
      setStatus("error");
      setMessage("Web NFC is not available in this browser. Enter the tag UID manually.");
      return;
    }

    try {
      const reader = new Reader();
      reader.onreading = (event) => {
        const uid = event.serialNumber ?? "";
        setCashLookupValue(uid);
        setStatus("success");
        setMessage("NFC wristband read.");
      };
      reader.onreadingerror = () => {
        setStatus("error");
        setMessage("Could not read NFC wristband.");
      };
      await reader.scan();
      setMessage("Tap the attendee wristband.");
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

  async function cashTopUp() {
    const amount = Math.round(Number(cashAmount) * 100);
    const bonus = applyBonus ? Number.parseInt(bonusPercent, 10) : 0;

    if (!walletToken.trim()) {
      setStatus("error");
      setMessage(cashLookupMode === "nfc" ? "Tap or enter a wristband first." : "Scan or enter the wallet QR fallback first.");
      return;
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      setStatus("error");
      setMessage("Enter a positive cash amount.");
      return;
    }

    if (!Number.isInteger(bonus) || bonus < 0 || bonus > 100) {
      setStatus("error");
      setMessage("Bonus must be between 0 and 100 percent.");
      return;
    }

    setIsSaving(true);
    setMessage("Depositing cash to wallet...");

    try {
      const response = await fetch("/api/check-in/cash-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, walletToken, amountCents: amount, bonusPercent: bonus, deviceId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Could not deposit cash.");
        return;
      }

      setStatus("success");
      setCashAmount("");
      setCashWallet(cashWallet ? { ...cashWallet, balance_cents: payload.balance_cents } : cashWallet);
      setMessage(
        `Cash deposited. Credited ${formatMoney(payload.total_credit_cents)} including ${formatMoney(payload.bonus_cents)} bonus.`,
      );
      if (loaded?.wallet?.qr_token === walletToken) {
        setLoaded({
          ...loaded,
          wallet: { ...loaded.wallet, balance_cents: payload.balance_cents },
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  const cashAmountCents = Math.max(0, Math.round(Number(cashAmount || 0) * 100));
  const parsedBonusPercent = applyBonus ? Math.max(0, Number.parseInt(bonusPercent || "0", 10) || 0) : 0;
  const bonusCents = Math.round(cashAmountCents * (parsedBonusPercent / 100));
  const totalCreditCents = cashAmountCents + bonusCents;

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

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("wristband")}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black ${mode === "wristband" ? "neon-button" : "text-white/65 hover:bg-white/[0.08] hover:text-white"}`}
          >
            <Nfc size={16} />
            Wristband
          </button>
          <button
            type="button"
            onClick={() => setMode("cash")}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black ${mode === "cash" ? "neon-button" : "text-white/65 hover:bg-white/[0.08] hover:text-white"}`}
          >
            <Banknote size={16} />
            Cash Top-Up
          </button>
        </div>

        {mode === "wristband" ? (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                <Search size={18} className="text-cyan-200" />
                <input
                  value={ticketToken}
                  onChange={(event) => setTicketToken(event.target.value)}
                  className="h-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/35"
                  placeholder="ticket token, name, phone, or ticket id"
                />
              </label>
              <button type="button" onClick={() => loadTicket()} disabled={isSaving} className="neon-button h-12 px-5 text-sm disabled:opacity-50">
                Load Ticket
              </button>
              <button
                type="button"
                onClick={ticketScanState === "starting" ? cancelTicketScan : startTicketScan}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white/75"
              >
                {ticketScanState === "starting" ? <X size={17} /> : <Camera size={17} />}
                {ticketScanState === "starting" ? "Stop" : "Scan QR"}
              </button>
            </div>
            {(ticketScanState !== "idle" || ticketScanMessage) && (
              <div className="scan-frame overflow-hidden rounded-3xl bg-black text-white">
                {ticketScanState === "starting" && <video ref={ticketVideoRef} playsInline muted className="aspect-video w-full bg-black object-cover opacity-85" />}
                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm font-semibold">
                  <span className={ticketScanState === "unsupported" || ticketScanState === "error" ? "text-red-200" : "text-cyan-100"}>
                    {ticketScanMessage || "Ready to scan."}
                  </span>
                  {(ticketScanState === "unsupported" || ticketScanState === "error") && (
                    <button type="button" onClick={cancelTicketScan} className="text-white/55 hover:text-white">
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
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
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => {
                  setCashLookupMode("nfc");
                  updateCashLookupValue("");
                  cancelQrScan();
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-black ${cashLookupMode === "nfc" ? "neon-button" : "text-white/65 hover:bg-white/[0.08] hover:text-white"}`}
              >
                <Nfc size={16} />
                Wristband
              </button>
              <button
                type="button"
                onClick={() => {
                  setCashLookupMode("qr");
                  updateCashLookupValue("");
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-black ${cashLookupMode === "qr" ? "neon-button" : "text-white/65 hover:bg-white/[0.08] hover:text-white"}`}
              >
                <CreditCard size={16} />
                QR Fallback
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                {cashLookupMode === "nfc" ? <Nfc size={18} className="text-emerald-200" /> : <CreditCard size={18} className="text-emerald-200" />}
                <input
                  value={cashLookupValue}
                  onChange={(event) => updateCashLookupValue(event.target.value)}
                  className="h-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/35"
                  placeholder={cashLookupMode === "nfc" ? "NFC wristband UID" : "wallet QR token"}
                />
              </label>
              {cashLookupMode === "nfc" && (
                <button type="button" onClick={readCashNfc} className="h-12 rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white/75">
                  Scan NFC
                </button>
              )}
              {cashLookupMode === "qr" && (
                <button
                  type="button"
                  onClick={qrScanState === "starting" ? cancelQrScan : startQrScan}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white/75"
                >
                  {qrScanState === "starting" ? <X size={17} /> : <Camera size={17} />}
                  {qrScanState === "starting" ? "Stop" : "Scan QR"}
                </button>
              )}
            </div>
            {cashLookupMode === "qr" && (qrScanState !== "idle" || qrScanMessage) && (
              <div className="scan-frame overflow-hidden rounded-3xl bg-black text-white">
                {qrScanState === "starting" && <video ref={qrVideoRef} playsInline muted className="aspect-video w-full bg-black object-cover opacity-85" />}
                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm font-semibold">
                  <span className={qrScanState === "unsupported" || qrScanState === "error" ? "text-red-200" : "text-cyan-100"}>
                    {qrScanMessage || "Ready to scan."}
                  </span>
                  {(qrScanState === "unsupported" || qrScanState === "error") && (
                    <button type="button" onClick={cancelQrScan} className="text-white/55 hover:text-white">
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            )}
            {cashWallet && (
              <div className="grid gap-2 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4 text-sm text-emerald-100 sm:grid-cols-2">
                <p className="font-black">{cashWallet.attendee_name ?? "Wallet found"}</p>
                <p className="font-black sm:text-right">{formatMoney(cashWallet.balance_cents)}</p>
                <p className="text-emerald-100/70">Wallet {cashWallet.status}</p>
                <p className="text-emerald-100/70 sm:text-right">NFC {cashWallet.nfc_status ?? "fallback"}</p>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                <Banknote size={18} className="text-cyan-200" />
                <input
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(event) => setCashAmount(event.target.value)}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  placeholder="cash amount"
                />
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                <Percent size={18} className="text-fuchsia-200" />
                <input
                  inputMode="numeric"
                  value={bonusPercent}
                  onChange={(event) => setBonusPercent(event.target.value)}
                  disabled={!applyBonus}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35 disabled:text-white/30"
                />
              </label>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-3 text-sm font-bold text-emerald-100">
              Add bonus to cash deposit
              <input type="checkbox" checked={applyBonus} onChange={(event) => setApplyBonus(event.target.checked)} className="size-5 accent-emerald-300" />
            </label>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-sm text-white/45">Wallet credit</p>
              <p className="mt-1 text-3xl font-black text-white">{formatMoney(totalCreditCents)}</p>
              <p className="mt-1 text-xs text-white/45">
                Cash {formatMoney(cashAmountCents)} + bonus {formatMoney(bonusCents)}
              </p>
            </div>
            <button type="button" onClick={cashTopUp} disabled={isSaving} className="neon-button h-12 px-5 text-sm disabled:opacity-50">
              Deposit Cash to Wallet
            </button>
          </div>
        )}

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
            {loaded.wallet?.qr_token && (
              <button
                type="button"
                onClick={() => {
                  setMode("cash");
                  setWalletToken(loaded.wallet?.qr_token ?? "");
                }}
                className="mt-3 h-12 w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.10] px-4 text-sm font-black text-cyan-100"
              >
                Use This Wallet for Cash Top-Up
              </button>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-white/55">No ticket loaded.</p>
        )}
      </aside>
    </div>
  );
}
