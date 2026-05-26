import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const ticketTypeId = String(body.ticketTypeId ?? "");
  const couponCode = String(body.couponCode ?? "").trim();
  const cookieStore = await cookies();
  const attendeeId = cookieStore.get("event_wallet_user_id")?.value;

  if (!eventId || !ticketTypeId || !attendeeId) {
    return NextResponse.json({ error: "Missing event, ticket type, or attendee." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: true,
      ticket_id: `mock-ticket-${Date.now()}`,
      ticket_token: `ticket_mock_${Date.now()}`,
      promo_code: couponCode || null,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data: authUser } = await supabase.auth.admin.getUserById(attendeeId);
  const attendeeEmail = authUser.user?.email ?? null;

  const { error: memberError } = await supabase.from("event_members").upsert(
    {
      event_id: eventId,
      user_id: attendeeId,
      role: "attendee",
    },
    { onConflict: "event_id,user_id" },
  );
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  const { data: existingWallet, error: existingWalletError } = await supabase
    .from("wallets")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", attendeeId)
    .maybeSingle();
  if (existingWalletError) {
    return NextResponse.json({ error: existingWalletError.message }, { status: 400 });
  }

  if (!existingWallet) {
    const { error: walletError } = await supabase.from("wallets").insert({
      event_id: eventId,
      user_id: attendeeId,
      balance_cents: 0,
      status: "active",
    });
    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 400 });
    }
  }

  const { data, error } = await supabase.rpc("issue_ticket_with_promo", {
    p_event_id: eventId,
    p_ticket_type_id: ticketTypeId,
    p_attendee_id: attendeeId,
    p_promo_code: couponCode || null,
    p_attendee_email: attendeeEmail,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
