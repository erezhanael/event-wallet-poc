"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Minus, Search, ShoppingCart, Trash2, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { MenuItem, Wallet } from "@/lib/types";

type Cart = Record<string, number>;

export function CheckoutClient({ menuItems, wallet }: { menuItems: MenuItem[]; wallet: Wallet }) {
  const [walletToken, setWalletToken] = useState(wallet.qr_token);
  const [balance, setBalance] = useState(wallet.balance_cents);
  const [cart, setCart] = useState<Cart>({});
  const [status, setStatus] = useState<"idle" | "success" | "failure">("idle");
  const [message, setMessage] = useState("");

  const total = useMemo(
    () => menuItems.reduce((sum, item) => sum + (cart[item.id] ?? 0) * item.price_cents, 0),
    [cart, menuItems],
  );

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
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Search size={18} className="text-slate-500" />
          <input
            value={walletToken}
            onChange={(event) => setWalletToken(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Scan or enter wallet token"
          />
        </div>
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
