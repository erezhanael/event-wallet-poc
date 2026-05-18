import { NextResponse } from "next/server";
import { requireOrganizerForEvent } from "@/lib/menu-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type MenuItemInput = {
  eventId?: string;
  name?: string;
  category?: string;
  priceCents?: number;
};

function cleanMenuItemInput(input: MenuItemInput) {
  const name = input.name?.trim();
  const category = input.category?.trim();
  const priceCents = Number(input.priceCents);

  if (!input.eventId || !name || !category || !Number.isInteger(priceCents) || priceCents <= 0) {
    return { error: "Event, name, category, and a positive integer price are required" };
  }

  return { eventId: input.eventId, name, category, priceCents };
}

export async function POST(request: Request) {
  const cleaned = cleanMenuItemInput((await request.json()) as MenuItemInput);
  if ("error" in cleaned) {
    return NextResponse.json({ error: cleaned.error }, { status: 400 });
  }

  const auth = await requireOrganizerForEvent(cleaned.eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      event_id: cleaned.eventId,
      name: cleaned.name,
      category: cleaned.category,
      price_cents: cleaned.priceCents,
      active: true,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      event_id: cleaned.eventId,
      name: cleaned.name,
      category: cleaned.category,
      price_cents: cleaned.priceCents,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
