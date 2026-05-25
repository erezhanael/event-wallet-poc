import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

function priceToCents(price: unknown) {
  const value = Number(String(price ?? "").trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ ticketTypeId: string }> }) {
  const { ticketTypeId } = await params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const priceCents = priceToCents(body.price);
  const quantityTotal = Number(body.quantityTotal ?? 0);
  const active = Boolean(body.active);

  if (!name || priceCents === null || !Number.isInteger(quantityTotal) || quantityTotal < 0) {
    return NextResponse.json({ error: "Name, price, and quantity are required." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: ticketTypeId,
      name,
      description: description || null,
      price_cents: priceCents,
      quantity_total: quantityTotal,
      quantity_sold: 0,
      active,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ticket_types")
    .update({
      name,
      description: description || null,
      price_cents: priceCents,
      quantity_total: quantityTotal,
      active,
    })
    .eq("id", ticketTypeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
