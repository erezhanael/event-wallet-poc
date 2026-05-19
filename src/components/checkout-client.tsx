"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera, CheckCircle, Minus, Search, ShoppingCart, Trash2, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section className="glass-card p-4">
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 shadow-inner">
            <Search size={18} className="shrink-0 text-cyan-200" />
            <input
              value={walletToken}
              onChange={(event) => setWalletToken(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              placeholder="Scan or enter wallet token"
            />
          </div>
          <button
            type="button"
            onClick={scanState === "starting" ? cancelScan : startScan}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.10] px-4 text-sm font-bold text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.14)] hover:border-cyan-200/60"
          >
            {scanState === "starting" ? <X size={17} /> : <Camera size={17} />}
            {scanState === "starting" ? "Stop" : "Scan"}
          </button>
        </div>
        {scanState !== "idle" || scanMessage ? (
          <div className="scan-frame mb-4 overflow-hidden rounded-3xl bg-black text-white">
            {scanState === "starting" && <video ref={videoRef} playsInline muted className="aspect-video w-full bg-black object-cover opacity-85" />}
            <div className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className={scanState === "unsupported" || scanState === "error" ? "text-red-200" : "text-cyan-100"}>
                {scanMessage || "Ready to scan."}
              </span>
              {(scanState === "unsupported" || scanState === "error") && (
                <button type="button" onClick={cancelScan} className="shrink-0 rounded-full bg-white/10 px-3 py-1 font-semibold hover:bg-white/20">
                  Close
                </button>
              )}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => addItem(item.id)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              className="group min-h-32 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-left transition hover:border-emerald-300/50 hover:bg-emerald-300/[0.10] hover:shadow-[0_0_32px_rgba(34,197,94,0.18)]"
            >
              <span className="neon-badge w-fit border-fuchsia-300/25 bg-fuchsia-300/[0.10] text-[10px] text-fuchsia-100">{item.category}</span>
              <span className="mt-4 block text-base font-black leading-tight text-white">{item.name}</span>
              <span className="mt-5 block text-2xl font-black tracking-tight text-emerald-200">{formatMoney(item.price_cents)}</span>
            </motion.button>
          ))}
        </div>
      </section>
      <aside className="glass-card sticky bottom-3 top-24 h-fit p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Checkout</h2>
          <ShoppingCart size={18} className="text-emerald-200" />
        </div>
        <div className="shine mt-4 overflow-hidden rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.10] p-4 text-white shadow-[0_0_40px_rgba(34,197,94,0.16)]">
          <p className="text-sm text-emerald-100/75">Wallet balance</p>
          <p className="mt-1 text-4xl font-black tracking-tight">{formatMoney(balance)}</p>
        </div>
        <div className="mt-4 space-y-2">
          <AnimatePresence initial={false}>
            {menuItems
            .filter((item) => cart[item.id])
            .map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-white/45">
                    x {cart[item.id]} · {formatMoney(item.price_cents * cart[item.id])}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="grid size-10 place-items-center rounded-2xl border border-red-300/25 bg-red-300/[0.08] text-red-100 hover:border-red-300/60"
                  aria-label={`Remove one ${item.name}`}
                  title={`Remove one ${item.name}`}
                >
                  <Minus size={18} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {total > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-300/25 bg-red-300/[0.08] text-sm font-semibold text-red-100 hover:border-red-300/60"
            >
              <Trash2 size={16} />
              Clear Cart
            </button>
          )}
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-lg font-black text-white">
            <span>Total</span>
            <motion.span key={total} initial={{ scale: 0.92, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}>
              {formatMoney(total)}
            </motion.span>
          </div>
          <button
            onClick={charge}
            className="neon-button mt-4 h-14 w-full disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-white/35 disabled:shadow-none"
            disabled={total === 0}
          >
            Charge Wallet
          </button>
          <AnimatePresence>
            {status !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mt-3 flex items-center gap-2 rounded-2xl border p-3 text-sm font-bold ${
                  status === "success"
                    ? "border-emerald-300/30 bg-emerald-300/[0.14] text-emerald-100 shadow-[0_0_40px_rgba(34,197,94,0.18)]"
                    : "border-red-300/30 bg-red-300/[0.14] text-red-100"
                }`}
              >
                {status === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
