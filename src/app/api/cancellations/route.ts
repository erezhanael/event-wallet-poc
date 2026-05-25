import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { defaultCancellationPolicy } from "@/lib/data";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import type { CancellationPolicy } from "@/lib/types";

function calculateRefundAmount(priceCents: number, eventStartTime: string, policy: Pick<CancellationPolicy, "full_refund_until_hours" | "partial_refund_until_hours" | "partial_refund_percent">) {
  const hoursUntilEvent = (new Date(eventStartTime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilEvent >= policy.full_refund_until_hours) return priceCents;
  if (hoursUntilEvent >= policy.partial_refund_until_hours) return Math.round(priceCents * (policy.partial_refund_percent / 100));
  return 0;
}

export async function POST(request: Request) {
  const body = await request.json();
  const ticketId = String(body.ticketId ?? "");
  const reason = String(body.reason ?? "").trim();
  const cookieStore = await cookies();
  const attendeeId = cookieStore.get("event_wallet_user_id")?.value;

  if (!ticketId || !attendeeId) {
    return NextResponse.json({ error: "Missing ticket or attendee." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  const supabase = createServiceSupabaseClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("*, event:events(*), ticket_type:ticket_types(*)")
    .eq("id", ticketId)
    .eq("attendee_id", attendeeId)
    .maybeSingle();

  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 400 });
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  if (ticket.status !== "active") return NextResponse.json({ error: "Only active tickets can be cancelled." }, { status: 400 });

  const { data: savedPolicy, error: policyError } = await supabase
    .from("cancellation_policies")
    .select("*")
    .eq("event_id", ticket.event_id)
    .maybeSingle();
  if (policyError) return NextResponse.json({ error: policyError.message }, { status: 400 });
  const policy = savedPolicy ?? defaultCancellationPolicy;

  if (!policy.enabled) return NextResponse.json({ error: "Cancellation requests are closed for this event." }, { status: 400 });
  if (policy.block_after_checkin && ticket.checked_in_at) return NextResponse.json({ error: "Checked-in tickets cannot be cancelled." }, { status: 400 });

  const { data: existingRequest, error: existingError } = await supabase
    .from("ticket_cancellation_requests")
    .select("id, status")
    .eq("ticket_id", ticketId)
    .eq("status", "pending")
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
  if (existingRequest) return NextResponse.json({ error: "A cancellation request is already pending for this ticket." }, { status: 409 });

  const event = Array.isArray(ticket.event) ? ticket.event[0] : ticket.event;
  const ticketType = Array.isArray(ticket.ticket_type) ? ticket.ticket_type[0] : ticket.ticket_type;
  const refundAmountCents = calculateRefundAmount(ticketType?.price_cents ?? 0, event.start_time, policy);

  const { data: createdRequest, error: createError } = await supabase
    .from("ticket_cancellation_requests")
    .insert({
      event_id: ticket.event_id,
      ticket_id: ticket.id,
      attendee_id: attendeeId,
      reason,
      refund_amount_cents: refundAmountCents,
      refund_mode: policy.refund_mode,
    })
    .select()
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
  return NextResponse.json({ ok: true, request: createdRequest });
}
