import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const walletToken = String(body.walletToken ?? "").trim();
  const amountCents = Number(body.amountCents ?? 0);
  const bonusPercent = Number(body.bonusPercent ?? 0);
  const deviceId = String(body.deviceId ?? "");
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("event_wallet_user_id")?.value;
  const role = cookieStore.get("event_wallet_role")?.value;

  if (!eventId || !walletToken || !staffUserId || role !== "checkin") {
    return NextResponse.json({ error: "Missing event, wallet token, or check-in staff session." }, { status: 400 });
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Enter a positive cash amount." }, { status: 400 });
  }

  if (!Number.isInteger(bonusPercent) || bonusPercent < 0 || bonusPercent > 100) {
    return NextResponse.json({ error: "Bonus must be between 0 and 100 percent." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const bonusCents = Math.round(amountCents * (bonusPercent / 100));
    return NextResponse.json({
      ok: true,
      transaction_id: `mock-cash-topup-${Date.now()}`,
      wallet_id: "mock-wallet",
      balance_cents: 8500 + amountCents + bonusCents,
      cash_amount_cents: amountCents,
      bonus_cents: bonusCents,
      total_credit_cents: amountCents + bonusCents,
      mock: true,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("checkin_cash_topup", {
    p_event_id: eventId,
    p_wallet_token: walletToken,
    p_cash_amount_cents: amountCents,
    p_bonus_percent: bonusPercent,
    p_staff_user_id: staffUserId,
    p_device_id: deviceId || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
