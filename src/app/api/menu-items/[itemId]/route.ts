import { NextResponse } from "next/server";
import { requireOrganizerForEvent } from "@/lib/menu-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

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

  const auth = await requireOrganizerForEvent(cleaned.eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: itemId,
      event_id: cleaned.eventId,
      name: cleaned.name,
      category: cleaned.category,
      price_cents: cleaned.priceCents,
      active: cleaned.active,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({
      name: cleaned.name,
      category: cleaned.category,
      price_cents: cleaned.priceCents,
      active: cleaned.active,
    })
    .eq("id", itemId)
    .eq("event_id", cleaned.eventId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
