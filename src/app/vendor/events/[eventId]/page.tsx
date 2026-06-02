import Link from "next/link";
import { Monitor, ShoppingCart } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { MenuEditor } from "@/components/menu-editor";
import { getEvent, getVendorMenuItems, getVendorStations } from "@/lib/data";
import { requireVendorForEvent } from "@/lib/vendor-auth";

export default async function VendorEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const auth = await requireVendorForEvent(eventId);
  if (!auth.ok) {
    return (
      <AppShell>
        <p className="glass-card p-5 text-red-100">{auth.error}</p>
      </AppShell>
    );
  }

  const cookieStore = await cookies();
  const vendorId = cookieStore.get("event_wallet_user_id")?.value;
  const [event, menuItems, stations] = await Promise.all([
    getEvent(eventId),
    getVendorMenuItems(eventId, vendorId),
    getVendorStations(eventId, vendorId),
  ]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-5">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Vendor menu</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">{event.name}</h1>
        <p className="mt-2 text-white/55">Create your items and prices. These items appear in your vendor POS only.</p>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Link href={`/vendor/checkout/${eventId}`} className="neon-button flex h-12 items-center justify-center gap-2 px-4 text-sm">
          <ShoppingCart size={17} />
          Open Vendor POS
        </Link>
        {stations[0] && (
          <Link
            href={`/monitor/${eventId}/${stations[0].monitor_slug}`}
            target="_blank"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm font-black text-white/75 hover:bg-white/[0.12]"
          >
            <Monitor size={17} />
            Open Station Monitor
          </Link>
        )}
      </div>
      {stations[0] && (
        <section className="glass-card mb-4 p-4">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/40">Assigned station</p>
          <h2 className="mt-2 text-2xl font-black text-white">{stations[0].name}</h2>
          <p className="mt-2 font-mono text-lg font-black text-cyan-100">Pairing {stations[0].pairing_code}</p>
        </section>
      )}
      <MenuEditor eventId={eventId} currency={event.currency} initialItems={menuItems} />
    </AppShell>
  );
}
