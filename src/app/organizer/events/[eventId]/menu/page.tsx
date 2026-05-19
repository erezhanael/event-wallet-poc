import { AppShell } from "@/components/app-shell";
import { MenuEditor } from "@/components/menu-editor";
import { getEvent, getOrganizerMenuItems } from "@/lib/data";

export default async function MenuPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event, items] = await Promise.all([getEvent(eventId), getOrganizerMenuItems(eventId)]);

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">Drink catalog</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Menu</h1>
        <p className="mt-2 text-white/55">{event?.name}</p>
      </div>
      <MenuEditor eventId={eventId} currency={event?.currency} initialItems={items} />
    </AppShell>
  );
}
