import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { defaultCancellationPolicy } from "@/lib/data";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const body = await request.json();
  const cookieStore = await cookies();
  const organizerId = cookieStore.get("event_wallet_user_id")?.value;
  const role = cookieStore.get("event_wallet_role")?.value;

  if (!eventId || !organizerId || role !== "organizer") {
    return NextResponse.json({ error: "Organizer access required." }, { status: 403 });
  }

  const enabled = Boolean(body.enabled);
  const fullRefundUntilHours = Math.max(0, Number.parseInt(String(body.fullRefundUntilHours ?? defaultCancellationPolicy.full_refund_until_hours), 10));
  const partialRefundUntilHours = Math.max(0, Number.parseInt(String(body.partialRefundUntilHours ?? defaultCancellationPolicy.partial_refund_until_hours), 10));
  const partialRefundPercent = Math.min(100, Math.max(0, Number.parseInt(String(body.partialRefundPercent ?? defaultCancellationPolicy.partial_refund_percent), 10)));
  const refundMode = ["manual", "wallet_credit", "original_payment"].includes(String(body.refundMode))
    ? String(body.refundMode)
    : defaultCancellationPolicy.refund_mode;

  if (partialRefundUntilHours > fullRefundUntilHours) {
    return NextResponse.json({ error: "Partial refund cutoff must be less than or equal to the full refund cutoff." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 });
  if (!event || event.organizer_id !== organizerId) {
    return NextResponse.json({ error: "You can only edit policies for your events." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("cancellation_policies")
    .upsert(
      {
        event_id: eventId,
        enabled,
        full_refund_until_hours: fullRefundUntilHours,
        partial_refund_until_hours: partialRefundUntilHours,
        partial_refund_percent: partialRefundPercent,
        refund_mode: refundMode,
        requires_approval: Boolean(body.requiresApproval),
        block_after_checkin: Boolean(body.blockAfterCheckin),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
