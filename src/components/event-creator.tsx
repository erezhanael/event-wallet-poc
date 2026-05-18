"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";

type Draft = {
  name: string;
  eventCode: string;
  startTime: string;
  endTime: string;
  currency: string;
};

const emptyDraft: Draft = {
  name: "",
  eventCode: "",
  startTime: "",
  endTime: "",
  currency: "ILS",
};

export function EventCreator() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function createEvent() {
    if (!draft.name.trim() || !draft.eventCode.trim() || !draft.startTime || !draft.endTime) {
      setMessage("Add a name, event code, start time, and end time.");
      return;
    }

    setIsSaving(true);
    setMessage("Creating event...");

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Could not create event.");
        return;
      }

      setDraft(emptyDraft);
      setMessage("Event created.");
      router.push(`/organizer/events/${payload.id}`);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CalendarPlus size={19} className="text-emerald-700" />
        <h2 className="font-semibold">Add Event</h2>
      </div>
      <div className="grid gap-3">
        <label className="text-sm font-medium text-slate-700">
          Event name
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
            placeholder="Summer Rooftop"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
          <label className="text-sm font-medium text-slate-700">
            Event code
            <input
              value={draft.eventCode}
              onChange={(event) => setDraft((current) => ({ ...current, eventCode: event.target.value.toUpperCase() }))}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 font-mono text-sm uppercase outline-none focus:border-emerald-500"
              placeholder="SUMMER-26"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Currency
            <input
              value={draft.currency}
              onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 font-mono text-sm uppercase outline-none focus:border-emerald-500"
              maxLength={3}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Starts
            <input
              type="datetime-local"
              value={draft.startTime}
              onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Ends
            <input
              type="datetime-local"
              value={draft.endTime}
              onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={createEvent}
          disabled={isSaving}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <CalendarPlus size={17} />
          Create Event
        </button>
      </div>
      {message && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
