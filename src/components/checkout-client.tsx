"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle, Minus, Search, ShoppingCart, Trash2, X, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { MenuItem, Wallet } from "@/lib/types";

type Cart = Record<string, number>;
type ScanState = "idle" | "starting" | "unsupported" | "error";

export function CheckoutClient({ menuItems, wallet }: { menuItems: MenuItem[]; wallet: Wallet }) {
  const [walletToken, setWalletToken] = useState(wallet.qr_token);
  const [balance, setBalance] = useState(wallet.balance_cents);
  const [cart, setCart] = useState<Cart>({});
  const [status, setStatus] = useState<"idle" | "success" | "failure">("idle");
  const [message, setMessage] = useState("");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanMessage, setScanMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  const total = useMemo(
    () => menuItems.reduce((sum, item) => sum + (cart[item.id] ?? 0) * item.price_cents, 0),
    [cart, menuItems],
  );

  function stopCamera() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    if (scanState !== "starting") return;

    let isActive = true;

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScanState("unsupported");
        setScanMessage("Camera access requires Safari camera permission and a secure HTTPS page.");
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      try {
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          const token = result?.getText().trim();
          if (!token) return;

          setWalletToken(token);
          setStatus("idle");
          setScanMessage("Wallet token scanned.");
          setScanState("idle");
        });

        if (!isActive) {
          controls.stop();
          return;
        }

        scannerControlsRef.current = controls;
        setScanMessage("Point the camera at an attendee wallet QR.");
      } catch {
        setScanState("error");
        setScanMessage("Camera permission was blocked or no camera was found. Manual token entry still works.");
      }
    }

    startScanner();

    return () => {
      isActive = false;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [scanState]);

  useEffect(() => {
    if (scanState === "starting") return;
    stopCamera();
  }, [scanState]);

  useEffect(() => stopCamera, []);

  function addItem(id: string) {
    setStatus("idle");
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  }

  function removeItem(id: string) {
    setStatus("idle");
    setCart((current) => {
      const quantity = current[id] ?? 0;
      if (quantity <= 1) {
        const rest = { ...current };
        delete rest[id];
        return rest;
      }

      return { ...current, [id]: quantity - 1 };
    });
  }

  function clearCart() {
    setStatus("idle");
    setCart({});
  }

  function startScan() {
    setStatus("idle");
    setScanMessage("Starting camera...");
    setScanState("starting");
  }

  function cancelScan() {
    setScanMessage("");
    setScanState("idle");
  }

  async function charge() {
    if (total <= 0) return;
    if (balance < total) {
      setStatus("failure");
      setMessage("Balance too low");
      return;
    }

    const response = await fetch("/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletToken,
        eventId: wallet.event_id,
        items: Object.entries(cart)
          .filter(([, quantity]) => quantity > 0)
          .map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setStatus("failure");
      setMessage(payload.error ?? "Purchase rejected");
      return;
    }

    setBalance(payload.balance_cents ?? balance - total);
    setCart({});
    setStatus("success");
    setMessage("Payment complete");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={18} className="shrink-0 text-slate-500" />
            <input
              value={walletToken}
              onChange={(event) => setWalletToken(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="Scan or enter wallet token"
            />
          </div>
          <button
            type="button"
            onClick={scanState === "starting" ? cancelScan : startScan}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800"
          >
            {scanState === "starting" ? <X size={17} /> : <Camera size={17} />}
            {scanState === "starting" ? "Stop" : "Scan"}
          </button>
        </div>
        {scanState !== "idle" || scanMessage ? (
          <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white">
            {scanState === "starting" && <video ref={videoRef} playsInline muted className="aspect-video w-full bg-black object-cover" />}
            <div className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className={scanState === "unsupported" || scanState === "error" ? "text-red-200" : "text-slate-200"}>
                {scanMessage || "Ready to scan."}
              </span>
              {(scanState === "unsupported" || scanState === "error") && (
                <button type="button" onClick={cancelScan} className="shrink-0 rounded-md bg-white/10 px-3 py-1 font-semibold hover:bg-white/20">
                  Close
                </button>
              )}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addItem(item.id)}
              className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-emerald-500 hover:bg-emerald-50"
            >
              <span className="block text-sm font-semibold">{item.name}</span>
              <span className="mt-1 block text-xs text-slate-500">{item.category}</span>
              <span className="mt-4 block text-lg font-semibold">{formatMoney(item.price_cents)}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Checkout</h2>
          <ShoppingCart size={18} />
        </div>
        <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
          <p className="text-sm text-slate-300">Wallet balance</p>
          <p className="mt-1 text-3xl font-semibold">{formatMoney(balance)}</p>
        </div>
        <div className="mt-4 space-y-2">
          {menuItems
            .filter((item) => cart[item.id])
            .map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-slate-50 p-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    x {cart[item.id]} · {formatMoney(item.price_cents * cart[item.id])}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="grid size-10 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remove one ${item.name}`}
                  title={`Remove one ${item.name}`}
                >
                  <Minus size={18} />
                </button>
              </div>
            ))}
          {total > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={16} />
              Clear Cart
            </button>
          )}
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
          <button
            onClick={charge}
            className="mt-4 h-14 w-full rounded-lg bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={total === 0}
          >
            Charge Wallet
          </button>
          {status !== "idle" && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
                status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
              }`}
            >
              {status === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
              {message}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
