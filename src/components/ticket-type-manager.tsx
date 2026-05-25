"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Save, Ticket, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import type { TicketType } from "@/lib/types";

type Draft = {
  name: string;
  description: string;
  price: string;
  quantityTotal: string;
};

type EditingDraft = Draft & {
  active: boolean;
};

const emptyDraft: Draft = { name: "", description: "", price: "", quantityTotal: "" };
const inputClass =
  "mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/60";

function centsToPrice(priceCents: number) {
  return (priceCents / 100).toFixed(2);
}

export function TicketTypeManager({
  eventId,
  currency,
  initialTicketTypes,
}: {
  eventId: string;
  currency?: string;
  initialTicketTypes: TicketType[];
}) {
  const router = useRouter();
  const [ticketTypes, setTicketTypes] = useState(initialTicketTypes);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sortedTicketTypes = useMemo(
    () => [...ticketTypes].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
    [ticketTypes],
  );

  async function createTicketType() {
    if (!draft.name.trim() || !draft.price.trim() || !draft.quantityTotal.trim()) {
      setMessage("Add a name, price, and quantity.");
      return;
    }

    setIsSaving(true);
    setMessage("Creating ticket...");

    try {
      const response = await fetch("/api/ticket-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ...draft }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not create ticket.");
        return;
      }

      setTicketTypes((current) => [payload, ...current]);
      setDraft(emptyDraft);
      setMessage("Ticket type created.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(ticketType: TicketType) {
    setEditingId(ticketType.id);
    setEditingDraft({
      name: ticketType.name,
      description: ticketType.description ?? "",
      price: centsToPrice(ticketType.price_cents),
      quantityTotal: String(ticketType.quantity_total),
      active: ticketType.active,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingDraft(null);
  }

  async function saveTicketType(ticketType: TicketType, override?: Partial<EditingDraft>) {
    const nextDraft = {
      name: editingId === ticketType.id && editingDraft ? editingDraft.name : ticketType.name,
      description: editingId === ticketType.id && editingDraft ? editingDraft.description : ticketType.description ?? "",
      price: editingId === ticketType.id && editingDraft ? editingDraft.price : centsToPrice(ticketType.price_cents),
      quantityTotal: editingId === ticketType.id && editingDraft ? editingDraft.quantityTotal : String(ticketType.quantity_total),
      active: editingId === ticketType.id && editingDraft ? editingDraft.active : ticketType.active,
      ...override,
    };

    setIsSaving(true);
    setMessage("Saving ticket...");

    try {
      const response = await fetch(`/api/ticket-types/${ticketType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextDraft),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not save ticket.");
        return;
      }

      setTicketTypes((current) => current.map((currentTicketType) => (currentTicketType.id === ticketType.id ? payload : currentTicketType)));
      cancelEditing();
      setMessage("Ticket type saved.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Ticket size={19} className="text-emerald-200" />
          <h2 className="font-black text-white">Create Ticket Type</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_120px_auto]">
          <label className="text-sm font-semibold text-white/70">
            Name
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={inputClass} placeholder="General Admission" />
          </label>
          <label className="text-sm font-semibold text-white/70">
            Description
            <input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className={inputClass} placeholder="Rooftop entry" />
          </label>
          <label className="text-sm font-semibold text-white/70">
            Price
            <input inputMode="decimal" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} className={inputClass} placeholder="65.00" />
          </label>
          <label className="text-sm font-semibold text-white/70">
            Quantity
            <input inputMode="numeric" value={draft.quantityTotal} onChange={(event) => setDraft((current) => ({ ...current, quantityTotal: event.target.value }))} className={inputClass} placeholder="200" />
          </label>
          <button type="button" onClick={createTicketType} disabled={isSaving} className="neon-button flex h-11 items-center justify-center gap-2 self-end px-4 text-sm disabled:opacity-50">
            <Plus size={17} />
            Add
          </button>
        </div>
        {message && <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/60">{message}</p>}
      </section>

      <section className="glass-card overflow-hidden">
        <div className="hidden grid-cols-[1fr_120px_120px_100px_190px] border-b border-white/10 px-4 py-3 text-sm font-bold text-white/45 md:grid">
          <span>Ticket</span>
          <span>Price</span>
          <span>Sold</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-white/10">
          {sortedTicketTypes.map((ticketType) => {
            const isEditing = editingId === ticketType.id && editingDraft;

            return (
              <div key={ticketType.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_120px_100px_190px] md:items-center">
                <div className="min-w-0">
                  {isEditing ? (
                    <div className="grid gap-2">
                      <input value={editingDraft.name} onChange={(event) => setEditingDraft((current) => (current ? { ...current, name: event.target.value } : current))} className={inputClass} />
                      <input value={editingDraft.description} onChange={(event) => setEditingDraft((current) => (current ? { ...current, description: event.target.value } : current))} className={inputClass} />
                    </div>
                  ) : (
                    <>
                      <p className="font-black text-white">{ticketType.name}</p>
                      <p className="mt-1 text-sm text-white/50">{ticketType.description ?? "No description"}</p>
                    </>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <input inputMode="decimal" value={editingDraft.price} onChange={(event) => setEditingDraft((current) => (current ? { ...current, price: event.target.value } : current))} className={inputClass} />
                  ) : (
                    <span className="font-black text-emerald-200">{formatMoney(ticketType.price_cents, currency)}</span>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <input inputMode="numeric" value={editingDraft.quantityTotal} onChange={(event) => setEditingDraft((current) => (current ? { ...current, quantityTotal: event.target.value } : current))} className={inputClass} />
                  ) : (
                    <span className="text-sm font-bold text-white/70">
                      {ticketType.quantity_sold} / {ticketType.quantity_total}
                    </span>
                  )}
                </div>
                <span className={`w-fit rounded-full border px-2 py-1 text-xs font-bold ${ticketType.active ? "border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100" : "border-white/10 bg-white/[0.08] text-white/45"}`}>
                  {ticketType.active ? "Active" : "Hidden"}
                </span>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={() => saveTicketType(ticketType)} disabled={isSaving} className="flex h-10 items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.14] px-3 text-sm font-bold text-emerald-100 disabled:opacity-50">
                        <Save size={16} />
                        Save
                      </button>
                      <button type="button" onClick={cancelEditing} className="grid size-10 place-items-center rounded-2xl border border-white/10 text-white/60 hover:bg-white/[0.08]" aria-label="Cancel edit">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEditing(ticketType)} className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-3 text-sm font-bold text-white/70 hover:bg-white/[0.08]">
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button type="button" onClick={() => saveTicketType(ticketType, { active: !ticketType.active })} disabled={isSaving} className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-3 text-sm font-bold text-white/70 hover:bg-white/[0.08] disabled:opacity-50">
                        {ticketType.active ? <EyeOff size={16} /> : <Eye size={16} />}
                        {ticketType.active ? "Hide" : "Show"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {sortedTicketTypes.length === 0 && <p className="p-4 text-sm text-white/55">No ticket types yet.</p>}
        </div>
      </section>
    </div>
  );
}
