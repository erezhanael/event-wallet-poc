import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

function hasUsableStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && (key.startsWith("sk_test_") || key.startsWith("sk_live_")) && !key.includes("your_key"));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const eventId = String(form.get("eventId") ?? "");
  const walletId = String(form.get("walletId") ?? "");
  const amountCents = Number(form.get("amountCents") ?? 0);
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!eventId || !walletId || !Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  if (!hasUsableStripeKey() || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const params = new URLSearchParams({
      walletId,
      amountCents: String(amountCents),
    });
    return NextResponse.redirect(`${origin}/attendee/topup/${eventId}/mock-checkout?${params.toString()}`, { status: 303 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/attendee/wallet/${eventId}?checkout=success`,
      cancel_url: `${origin}/attendee/topup/${eventId}?checkout=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "ils",
            unit_amount: amountCents,
            product_data: { name: "Event wallet top-up" },
          },
        },
      ],
      metadata: {
        event_id: eventId,
        wallet_id: walletId,
        amount_cents: String(amountCents),
      },
    });

    const supabase = createServiceSupabaseClient();
    await supabase.from("stripe_payments").insert({
      event_id: eventId,
      wallet_id: walletId,
      stripe_session_id: session.id,
      amount_cents: amountCents,
      status: "created",
    });

    if (!session.url) {
      return NextResponse.redirect(`${origin}/attendee/topup/${eventId}?checkout=error`, { status: 303 });
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch {
    return NextResponse.redirect(`${origin}/attendee/topup/${eventId}?checkout=error`, { status: 303 });
  }
}
