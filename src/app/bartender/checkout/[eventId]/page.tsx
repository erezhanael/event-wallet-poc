import { AppShell } from "@/components/app-shell";
import { CheckoutClient } from "@/components/checkout-client";
import { getMenuItems, getWallet } from "@/lib/data";

export default async function BartenderCheckoutPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [menuItems, wallet] = await Promise.all([getMenuItems(eventId), getWallet(eventId)]);

  if (!wallet) return <AppShell><p>No wallet available.</p></AppShell>;

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <p className="mt-2 text-slate-600">Scan the QR code, tap items, and charge the wallet.</p>
      </div>
      <CheckoutClient menuItems={menuItems} wallet={wallet} />
    </AppShell>
  );
}
