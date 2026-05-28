import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockWallet } from "@/lib/mock-data";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const { walletToken, eventId, items } = body as {
    walletToken?: string;
    eventId?: string;
    items?: Array<{ menuItemId: string; quantity: number }>;
  };

  if (!walletToken || !eventId || !items?.length) {
    return NextResponse.json({ error: "Missing walletToken, eventId, or items" }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const total = items.reduce((sum, item) => sum + item.quantity * 2200, 0);
    if (total > mockWallet.balance_cents) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
    }
    return NextResponse.json({ ok: true, balance_cents: mockWallet.balance_cents - total, mock: true });
  }

  const supabase = createServiceSupabaseClient();
  const cookieStore = await cookies();
  const bartenderId = cookieStore.get("event_wallet_user_id")?.value ?? null;
  const { data, error } = await supabase.rpc("deduct_wallet_purchase", {
    p_event_id: eventId,
    p_qr_token: walletToken,
    p_items: items,
    p_bartender_id: bartenderId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
