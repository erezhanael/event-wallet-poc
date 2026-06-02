import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockWallet } from "@/lib/mock-data";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type PurchaseItemInput = { menuItemId: string; quantity: number };

function isMissingRpcFunction(message: string) {
  return message.toLowerCase().includes("could not find the function public.deduct_wallet_purchase");
}

export async function POST(request: Request) {
  const body = await request.json();
  const { walletToken, eventId, items } = body as {
    walletToken?: string;
    eventId?: string;
    items?: PurchaseItemInput[];
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
  const staffId = cookieStore.get("event_wallet_user_id")?.value ?? null;
  const role = cookieStore.get("event_wallet_role")?.value;

  if (!staffId || (role !== "bartender" && role !== "vendor")) {
    return NextResponse.json({ error: "Assigned POS staff access is required" }, { status: 403 });
  }

  const { data: member, error: memberError } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", staffId)
    .in("role", ["bartender", "vendor"])
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  if (!member) {
    return NextResponse.json({ error: "POS staff is not assigned to this event" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("deduct_wallet_purchase", {
    p_event_id: eventId,
    p_qr_token: walletToken,
    p_items: items,
    p_bartender_id: staffId,
  });

  if (error) {
    if (!isMissingRpcFunction(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const fallback = await deductWalletPurchaseFallback({
      eventId,
      walletToken,
      items,
      bartenderId: staffId,
    });

    if ("error" in fallback) {
      return NextResponse.json({ error: fallback.error }, { status: fallback.status });
    }

    return NextResponse.json(fallback.data);
  }

  return NextResponse.json(data);
}

async function deductWalletPurchaseFallback({
  eventId,
  walletToken,
  items,
  bartenderId,
}: {
  eventId: string;
  walletToken: string;
  items: PurchaseItemInput[];
  bartenderId: string | null;
}) {
  const supabase = createServiceSupabaseClient();
  const normalizedItems = items
    .map((item) => ({ menuItemId: item.menuItemId, quantity: Math.max(0, Number(item.quantity)) }))
    .filter((item) => item.menuItemId && Number.isInteger(item.quantity) && item.quantity > 0);

  if (!normalizedItems.length) {
    return { error: "Cart is empty", status: 400 };
  }

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, balance_cents")
    .eq("event_id", eventId)
    .eq("qr_token", walletToken)
    .eq("status", "active")
    .maybeSingle();

  if (walletError) return { error: walletError.message, status: 400 };
  if (!wallet) return { error: "Active wallet not found", status: 404 };

  const menuIds = Array.from(new Set(normalizedItems.map((item) => item.menuItemId)));
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, price_cents")
    .eq("event_id", eventId)
    .eq("active", true)
    .in("id", menuIds);

  if (menuError) return { error: menuError.message, status: 400 };

  const menuById = new Map((menuItems ?? []).map((item) => [item.id, item]));
  let total = 0;

  for (const item of normalizedItems) {
    const menuItem = menuById.get(item.menuItemId);
    if (!menuItem) return { error: "Menu item not found", status: 404 };
    total += menuItem.price_cents * item.quantity;
  }

  if (wallet.balance_cents < total) {
    return { error: "Insufficient balance", status: 402 };
  }

  const nextBalance = wallet.balance_cents - total;
  const { error: walletUpdateError } = await supabase
    .from("wallets")
    .update({ balance_cents: nextBalance })
    .eq("id", wallet.id);

  if (walletUpdateError) return { error: walletUpdateError.message, status: 400 };

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      event_id: eventId,
      wallet_id: wallet.id,
      bartender_id: bartenderId,
      type: "purchase",
      amount_cents: -total,
      metadata: { source: "bar_checkout", fallback: "api_table_write" },
    })
    .select("id")
    .single();

  if (transactionError) return { error: transactionError.message, status: 400 };

  const purchaseItems = normalizedItems.map((item) => {
    const menuItem = menuById.get(item.menuItemId)!;
    return {
      transaction_id: transaction.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      price_cents: menuItem.price_cents,
    };
  });

  const { error: purchaseItemsError } = await supabase.from("purchase_items").insert(purchaseItems);
  if (purchaseItemsError) return { error: purchaseItemsError.message, status: 400 };

  return {
    data: {
      ok: true,
      transaction_id: transaction.id,
      balance_cents: nextBalance,
      fallback: true,
    },
  };
}
