import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireOrganizerForEvent } from "@/lib/menu-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { requireVendorForEvent } from "@/lib/vendor-auth";

type MenuItemUpdateInput = {
  eventId?: string;
  name?: string;
  category?: string;
  priceCents?: number;
  active?: boolean;
};

function cleanMenuItemUpdate(input: MenuItemUpdateInput) {
  const name = input.name?.trim();
  const category = input.category?.trim();
  const priceCents = Number(input.priceCents);

  if (!input.eventId || !name || !category || !Number.isInteger(priceCents) || priceCents <= 0 || typeof input.active !== "boolean") {
    return { error: "Event, name, category, active status, and a positive integer price are required" };
  }

  return { eventId: input.eventId, name, category, priceCents, active: input.active };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const cleaned = cleanMenuItemUpdate((await request.json()) as MenuItemUpdateInput);
  if ("error" in cleaned) {
    return NextResponse.json({ error: cleaned.error }, { status: 400 });
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("event_wallet_role")?.value;
  const userId = cookieStore.get("event_wallet_user_id")?.value ?? null;
  const auth = role === "vendor" ? await requireVendorForEvent(cleaned.eventId) : await requireOrganizerForEvent(cleaned.eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: itemId,
      event_id: cleaned.eventId,
      vendor_id: role === "vendor" ? userId : null,
      name: cleaned.name,
      category: cleaned.category,
      price_cents: cleaned.priceCents,
      active: cleaned.active,
    });
  }

  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from("menu_items")
    .update({
      name: cleaned.name,
      category: cleaned.category,
      price_cents: cleaned.priceCents,
      active: cleaned.active,
    })
    .eq("id", itemId)
    .eq("event_id", cleaned.eventId);

  if (role === "vendor") {
    query = query.eq("vendor_id", userId);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
