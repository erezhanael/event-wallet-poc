import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ promoCodeId: string }> }) {
  const { promoCodeId } = await params;
  const body = await request.json();
  const active = Boolean(body.active);
  const cookieStore = await cookies();
  const organizerId = cookieStore.get("event_wallet_user_id")?.value;

  if (!promoCodeId) {
    return NextResponse.json({ error: "Missing coupon." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: promoCodeId,
      active,
      updated_at: new Date().toISOString(),
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data: promotion, error: promotionError } = await supabase
    .from("ticket_promotions")
    .select("id, event:events!inner(organizer_id)")
    .eq("id", promoCodeId)
    .maybeSingle();
  if (promotionError) return NextResponse.json({ error: promotionError.message }, { status: 400 });

  const event = Array.isArray(promotion?.event) ? promotion?.event[0] : promotion?.event;
  if (!promotion || event?.organizer_id !== organizerId) {
    return NextResponse.json({ error: "Only the event organizer can update coupons." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("ticket_promotions")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", promoCodeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
