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
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto]">
          <label className="text-sm font-medium text-slate-700">
            Item
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
              placeholder="Gin Tonic"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Category
            <input
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
              placeholder="Cocktail"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Price
            <input
              inputMode="decimal"
              value={draft.price}
              onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
              placeholder="42.00"
            />
          </label>
          <button
            type="button"
            onClick={createItem}
            disabled={isSaving}
            className="flex h-11 items-center justify-center gap-2 self-end rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus size={17} />
            Add
          </button>
        </div>
        {message && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1fr_140px_120px_90px_190px] border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 md:grid">
          <span>Item</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedItems.map((item) => {
            const isEditing = editingId === item.id && editingDraft;

            return (
              <div key={item.id} className={`grid gap-3 px-4 py-4 md:grid-cols-[1fr_140px_120px_90px_190px] md:items-center ${item.active ? "" : "bg-slate-50"}`}>
                <div className="min-w-0">
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500 md:hidden">Item</span>
                  {isEditing ? (
                    <input
                      value={editingDraft.name}
                      onChange={(event) => setEditingDraft((current) => (current ? { ...current, name: event.target.value } : current))}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <p className={`font-medium ${item.active ? "text-slate-950" : "text-slate-500"}`}>{item.name}</p>
                  )}
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500 md:hidden">Category</span>
                  {isEditing ? (
                    <input
                      value={editingDraft.category}
                      onChange={(event) => setEditingDraft((current) => (current ? { ...current, category: event.target.value } : current))}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <span className="text-sm text-slate-700">{item.category}</span>
                  )}
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500 md:hidden">Price</span>
                  {isEditing ? (
                    <input
                      inputMode="decimal"
                      value={editingDraft.price}
                      onChange={(event) => setEditingDraft((current) => (current ? { ...current, price: event.target.value } : current))}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <span className="text-sm font-semibold">{formatMoney(item.price_cents, currency)}</span>
                  )}
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500 md:hidden">Status</span>
                  <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
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
                        className="flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Save size={16} />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="grid size-10 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
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
                        className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => saveItem(item, { active: !item.active })}
                        disabled={isSaving}
                        className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
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
