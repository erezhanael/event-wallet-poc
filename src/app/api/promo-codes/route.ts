import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

function priceToCents(price: unknown) {
  const value = Number(String(price ?? "").trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function parseEmails(value: unknown) {
  return String(value ?? "")
    .split(/[\n,;]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const code = String(body.code ?? "").trim().toUpperCase();
  const description = String(body.description ?? "").trim();
  const discountType = String(body.discountType ?? "percent");
  const maxRedemptionsText = String(body.maxRedemptions ?? "").trim();
  const maxRedemptions = maxRedemptionsText ? Number(maxRedemptionsText) : null;
  const eligibleEmails = parseEmails(body.eligibleEmails);
  let discountValue = 0;
  const cookieStore = await cookies();
  const organizerId = cookieStore.get("event_wallet_user_id")?.value;

  if (discountType === "percent") {
    discountValue = Number(body.discountValue ?? 0);
  } else if (discountType === "fixed") {
    const fixedCents = priceToCents(body.discountValue);
    discountValue = fixedCents ?? -1;
  }

  const validDiscount =
    (discountType === "free" && discountValue === 0) ||
    (discountType === "percent" && Number.isInteger(discountValue) && discountValue >= 1 && discountValue <= 100) ||
    (discountType === "fixed" && Number.isInteger(discountValue) && discountValue > 0);

  if (!eventId || !code || !["percent", "fixed", "free"].includes(discountType) || !validDiscount) {
    return NextResponse.json({ error: "Add a valid code and discount." }, { status: 400 });
  }

  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
    return NextResponse.json({ error: "Limit must be a positive number." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      id: `mock-promo-${Date.now()}`,
      event_id: eventId,
      code,
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      eligible_emails: eligibleEmails,
      max_redemptions: maxRedemptions,
      redeemed_count: 0,
      active: true,
      starts_at: null,
      ends_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", organizerId)
    .maybeSingle();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 });
  if (!event) return NextResponse.json({ error: "Only the event organizer can create coupons." }, { status: 403 });

  const { data, error } = await supabase
    .from("ticket_promotions")
    .insert({
      event_id: eventId,
      code,
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      eligible_emails: eligibleEmails,
      max_redemptions: maxRedemptions,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
