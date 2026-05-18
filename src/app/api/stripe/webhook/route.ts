import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook env is not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const walletId = session.metadata?.wallet_id;
    const eventId = session.metadata?.event_id;
    const amountCents = Number(session.metadata?.amount_cents ?? session.amount_total ?? 0);

    if (walletId && eventId && amountCents > 0) {
      const supabase = createServiceSupabaseClient();
      const { error } = await supabase.rpc("confirm_wallet_topup", {
        p_event_id: eventId,
        p_wallet_id: walletId,
        p_stripe_session_id: session.id,
        p_amount_cents: amountCents,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
