import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

function calculateDiscount(priceCents: number, promotion: { discount_type: string; discount_value: number }) {
  if (promotion.discount_type === "free") return priceCents;
  if (promotion.discount_type === "percent") return Math.min(priceCents, Math.round((priceCents * promotion.discount_value) / 100));
  return Math.min(priceCents, promotion.discount_value);
}

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const ticketTypeId = String(body.ticketTypeId ?? "");
  const couponCode = String(body.couponCode ?? "").trim();
  const cookieStore = await cookies();
  const attendeeId = cookieStore.get("event_wallet_user_id")?.value;

  if (!eventId || !ticketTypeId || !couponCode || !attendeeId) {
    return NextResponse.json({ error: "Missing event, ticket, coupon, or attendee." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, code: couponCode.toUpperCase(), discount_cents: 0, paid_amount_cents: 0 });
  }

  const supabase = createServiceSupabaseClient();
  const [{ data: ticketType, error: ticketTypeError }, { data: authUser }] = await Promise.all([
    supabase.from("ticket_types").select("id, event_id, price_cents, active").eq("id", ticketTypeId).eq("event_id", eventId).maybeSingle(),
    supabase.auth.admin.getUserById(attendeeId),
  ]);

  if (ticketTypeError) return NextResponse.json({ error: ticketTypeError.message }, { status: 400 });
  if (!ticketType || !ticketType.active) return NextResponse.json({ error: "Ticket type not found." }, { status: 404 });

  const { data: promotion, error: promotionError } = await supabase
    .from("ticket_promotions")
    .select("*")
    .eq("event_id", eventId)
    .ilike("code", couponCode)
    .maybeSingle();

  if (promotionError) return NextResponse.json({ error: promotionError.message }, { status: 400 });
  if (!promotion) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  if (!promotion.active) return NextResponse.json({ error: "Coupon is inactive." }, { status: 400 });
  if (promotion.starts_at && new Date(promotion.starts_at).getTime() > Date.now()) {
    return NextResponse.json({ error: "Coupon is not active yet." }, { status: 400 });
  }
  if (promotion.ends_at && new Date(promotion.ends_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Coupon has expired." }, { status: 400 });
  }
  if (promotion.max_redemptions !== null && promotion.redeemed_count >= promotion.max_redemptions) {
    return NextResponse.json({ error: "Coupon is fully redeemed." }, { status: 400 });
  }

  const attendeeEmail = authUser.user?.email?.trim().toLowerCase() ?? "";
  const eligibleEmails = (promotion.eligible_emails ?? []).map((email: string) => email.trim().toLowerCase()).filter(Boolean);
  if (eligibleEmails.length > 0 && !eligibleEmails.includes(attendeeEmail)) {
    return NextResponse.json({ error: "Coupon is not assigned to this email." }, { status: 403 });
  }

  const { data: redemption, error: redemptionError } = await supabase
    .from("ticket_promotion_redemptions")
    .select("id")
    .eq("promotion_id", promotion.id)
    .eq("attendee_id", attendeeId)
    .maybeSingle();
  if (redemptionError) return NextResponse.json({ error: redemptionError.message }, { status: 400 });
  if (redemption) return NextResponse.json({ error: "Coupon already used by this attendee." }, { status: 409 });

  const discountCents = calculateDiscount(ticketType.price_cents, promotion);

  return NextResponse.json({
    ok: true,
    code: promotion.code,
    discount_cents: discountCents,
    paid_amount_cents: Math.max(0, ticketType.price_cents - discountCents),
    discount_type: promotion.discount_type,
  });
}
