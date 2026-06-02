import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireOrganizerForEvent } from "@/lib/menu-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { requireVendorForEvent } from "@/lib/vendor-auth";

type MenuItemInput = {
  eventId?: string;
  name?: string;
  category?: string;
  priceCents?: number;
  vendorId?: string | null;
};

function cleanMenuItemInput(input: MenuItemInput) {
  const name = input.name?.trim();
  const category = input.category?.trim();
  const priceCents = Number(input.priceCents);

  if (!input.eventId || !name || !category || !Number.isInteger(priceCents) || priceCents <= 0) {
    return { error: "Event, name, category, and a positive integer price are required" };
  }

  return { eventId: input.eventId, name, category, priceCents, vendorId: input.vendorId ?? null };
}

export async function POST(request: Request) {
  const cleaned = cleanMenuItemInput((await request.json()) as MenuItemInput);
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
  const vendorId = role === "vendor" ? userId : cleaned.vendorId;

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      event_id: cleaned.eventId,
      vendor_id: vendorId,
      name: cleaned.name,
      category: cleaned.category,
      price_cents: cleaned.priceCents,
      active: true,
    });
  }

  const supabase = createServiceSupabaseClient();
  const itemPayload = {
    event_id: cleaned.eventId,
    name: cleaned.name,
    category: cleaned.category,
    price_cents: cleaned.priceCents,
    active: true,
    ...(vendorId ? { vendor_id: vendorId } : {}),
  };

  const { data, error } = await supabase
    .from("menu_items")
    .insert(itemPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
