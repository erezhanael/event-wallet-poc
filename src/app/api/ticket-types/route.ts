import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

function priceToCents(price: unknown) {
  const value = Number(String(price ?? "").trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const priceCents = priceToCents(body.price);
  const quantityTotal = Number(body.quantityTotal ?? 0);

  if (!eventId || !name || priceCents === null || !Number.isInteger(quantityTotal) || quantityTotal < 0) {
    return NextResponse.json({ error: "Add a name, price, and valid quantity." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: `mock-ticket-type-${Date.now()}`,
      event_id: eventId,
      name,
      description: description || null,
      price_cents: priceCents,
      quantity_total: quantityTotal,
      quantity_sold: 0,
      active: true,
      sales_start: null,
      sales_end: null,
      created_at: new Date().toISOString(),
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ticket_types")
    .insert({
      event_id: eventId,
      name,
      description: description || null,
      price_cents: priceCents,
      quantity_total: quantityTotal,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
