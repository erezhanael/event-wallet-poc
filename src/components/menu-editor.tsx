"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import type { MenuItem } from "@/lib/types";

type Draft = {
  name: string;
  category: string;
  price: string;
};

type EditingDraft = Draft & {
  active: boolean;
};

const emptyDraft: Draft = { name: "", category: "", price: "" };
const inputClass =
  "mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/60";
const compactInputClass =
  "h-10 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-emerald-300/60";

function centsToPrice(priceCents: number) {
  return (priceCents / 100).toFixed(2);
}

function priceToCents(price: string) {
  const normalized = price.trim().replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function MenuEditor({
  eventId,
  currency,
  initialItems,
}: {
  eventId: string;
  currency?: string;
  initialItems: MenuItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(b.active) - Number(a.active) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
    [items],
  );

  async function createItem() {
    const priceCents = priceToCents(draft.price);
    if (!draft.name.trim() || !draft.category.trim() || !priceCents) {
      setMessage("Add a name, category, and positive price.");
      return;
    }

    setIsSaving(true);
    setMessage("Adding item...");

    try {
      const response = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: draft.name,
          category: draft.category,
          priceCents,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not add item.");
        return;
      }

      setItems((current) => [...current, payload]);
      setDraft(emptyDraft);
      setMessage("Item added.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(item: MenuItem) {
    setEditingId(item.id);
    setEditingDraft({
      name: item.name,
      category: item.category,
      price: centsToPrice(item.price_cents),
      active: item.active,
    });
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingDraft(null);
  }

  async function saveItem(item: MenuItem, override?: Partial<EditingDraft>) {
    const nextDraft = {
      name: editingId === item.id && editingDraft ? editingDraft.name : item.name,
      category: editingId === item.id && editingDraft ? editingDraft.category : item.category,
      price: editingId === item.id && editingDraft ? editingDraft.price : centsToPrice(item.price_cents),
      active: editingId === item.id && editingDraft ? editingDraft.active : item.active,
      ...override,
    };
    const priceCents = priceToCents(nextDraft.price);

    if (!nextDraft.name.trim() || !nextDraft.category.trim() || !priceCents) {
      setMessage("Name, category, and positive price are required.");
      return;
    }

    setIsSaving(true);
    setMessage("Saving item...");

    try {
      const response = await fetch(`/api/menu-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: nextDraft.name,
          category: nextDraft.category,
          priceCents,
          active: nextDraft.active,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not save item.");
        return;
      }

      setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? payload : currentItem)));
      cancelEditing();
      setMessage(nextDraft.active ? "Item saved." : "Item hidden from checkout.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto]">
          <label className="text-sm font-semibold text-white/70">
            Item
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
              placeholder="Gin Tonic"
            />
          </label>
          <label className="text-sm font-semibold text-white/70">
            Category
            <input
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              className={inputClass}
              placeholder="Cocktail"
            />
          </label>
          <label className="text-sm font-semibold text-white/70">
            Price
            <input
              inputMode="decimal"
              value={draft.price}
              onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
              className={inputClass}
              placeholder="42.00"
            />
          </label>
          <button
            type="button"
            onClick={createItem}
            disabled={isSaving}
            className="neon-button flex h-11 items-center justify-center gap-2 self-end px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={17} />
            Add
          </button>
        </div>
        {message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/60">{message}</p>}
      </section>

      <section className="glass-card overflow-hidden">
        <div className="hidden grid-cols-[1fr_140px_120px_90px_190px] border-b border-white/10 px-4 py-3 text-sm font-bold text-white/45 md:grid">
          <span>Item</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-white/10">
          {sortedItems.map((item) => {
            const isEditing = editingId === item.id && editingDraft;

            return (
              <div key={item.id} className={`grid gap-3 px-4 py-4 md:grid-cols-[1fr_140px_120px_90px_190px] md:items-center ${item.active ? "" : "bg-white/[0.03]"}`}>
                <div className="min-w-0">
                  <span className="mb-1 block text-xs font-bold uppercase text-white/40 md:hidden">Item</span>
                  {isEditing ? (
                    <input
                      value={editingDraft.name}
                      onChange={(event) => setEditingDraft((current) => (current ? { ...current, name: event.target.value } : current))}
                      className={compactInputClass}
                    />
                  ) : (
                    <p className={`font-semibold ${item.active ? "text-white" : "text-white/40"}`}>{item.name}</p>
                  )}
                </div>
                <div>
                  <span className="mb-1 block text-xs font-bold uppercase text-white/40 md:hidden">Category</span>
                  {isEditing ? (
                    <input
                      value={editingDraft.category}
                      onChange={(event) => setEditingDraft((current) => (current ? { ...current, category: event.target.value } : current))}
                      className={compactInputClass}
                    />
                  ) : (
                    <span className="text-sm text-white/60">{item.category}</span>
                  )}
                </div>
                <div>
                  <span className="mb-1 block text-xs font-bold uppercase text-white/40 md:hidden">Price</span>
                  {isEditing ? (
                    <input
                      inputMode="decimal"
                      value={editingDraft.price}
                      onChange={(event) => setEditingDraft((current) => (current ? { ...current, price: event.target.value } : current))}
                      className={compactInputClass}
                    />
                  ) : (
                    <span className="text-sm font-black text-emerald-200">{formatMoney(item.price_cents, currency)}</span>
                  )}
                </div>
                <div>
                  <span className="mb-1 block text-xs font-bold uppercase text-white/40 md:hidden">Status</span>
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${item.active ? "border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100" : "border-white/10 bg-white/[0.08] text-white/45"}`}>
                    {item.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveItem(item)}
                        disabled={isSaving}
                        className="flex h-10 items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.14] px-3 text-sm font-bold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save size={16} />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="grid size-10 place-items-center rounded-2xl border border-white/10 text-white/60 hover:bg-white/[0.08]"
                        aria-label={`Cancel editing ${item.name}`}
                        title={`Cancel editing ${item.name}`}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-3 text-sm font-bold text-white/70 hover:bg-white/[0.08]"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => saveItem(item, { active: !item.active })}
                        disabled={isSaving}
                        className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-3 text-sm font-bold text-white/70 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {item.active ? <EyeOff size={16} /> : <Eye size={16} />}
                        {item.active ? "Hide" : "Show"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
