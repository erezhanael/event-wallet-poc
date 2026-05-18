import { AppShell } from "@/components/app-shell";
import { MenuEditor } from "@/components/menu-editor";
import { getEvent, getOrganizerMenuItems } from "@/lib/data";

export default async function MenuPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, items] = await Promise.all([getEvent(eventId), getOrganizerMenuItems(eventId)]);

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-3xl font-semibold">Menu</h1>
        <p className="mt-2 text-slate-600">{event?.name}</p>
      </div>
      <MenuEditor eventId={eventId} currency={event?.currency} initialItems={items} />
    </AppShell>
  );
}
