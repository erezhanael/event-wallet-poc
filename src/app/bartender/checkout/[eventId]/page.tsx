import { AppShell } from "@/components/app-shell";
import { CheckoutClient } from "@/components/checkout-client";
import { ShiftControls } from "@/components/shift-controls";
import { getCurrentBartenderShift, getMenuItems, getWallet } from "@/lib/data";
import { cookies } from "next/headers";

export default async function BartenderCheckoutPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const bartenderId = cookieStore.get("event_wallet_user_id")?.value;
  const [menuItems, wallet, currentShift] = await Promise.all([getMenuItems(eventId), getWallet(eventId), getCurrentBartenderShift(eventId, bartenderId)]);

  if (!wallet) return <AppShell><p>No wallet available.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-4">
        <p className="neon-badge w-fit border-fuchsia-300/30 bg-fuchsia-300/[0.10] text-fuchsia-100">High-speed bar POS</p>
        <h1 className="premium-heading mt-3 text-4xl sm:text-5xl">Checkout</h1>
        <p className="mt-2 text-white/55">Scan the QR code, tap items, and charge the wallet.</p>
      </div>
      <ShiftControls eventId={eventId} initialShift={currentShift} />
      <CheckoutClient menuItems={menuItems} wallet={wallet} />
    </AppShell>
  );
}
