import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { CheckoutClient } from "@/components/checkout-client";
import { getEvent, getVendorMenuItems, getVendorStations } from "@/lib/data";
import { requireVendorForEvent } from "@/lib/vendor-auth";

export default async function VendorCheckoutPage({ params }: { params: Promise<{ eventId: string }> }) {
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
    getVendorMenuItems(eventId, vendorId, false),
    getVendorStations(eventId, vendorId, false),
  ]);

  if (!event) return <AppShell><p>Event not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-4">
        <p className="neon-badge w-fit border-cyan-300/30 bg-cyan-300/[0.10] text-cyan-100">Vendor POS</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">POS</h1>
        <p className="mt-2 text-white/55">Scan the wallet, sell vendor items, and show the attendee balance on your station monitor.</p>
      </div>
      {menuItems.length === 0 ? (
        <p className="glass-card mb-4 p-4 text-sm text-amber-100">Add at least one active menu item before selling.</p>
      ) : null}
      <CheckoutClient eventId={eventId} currency={event.currency} menuItems={menuItems} stations={stations} />
    </AppShell>
  );
}
