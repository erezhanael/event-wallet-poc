import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

function calculateRefundAmount(priceCents: number, eventStartTime: string) {
  const hoursUntilEvent = (new Date(eventStartTime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilEvent >= 48) return priceCents;
  if (hoursUntilEvent >= 24) return Math.round(priceCents * 0.5);
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
  if (ticket.checked_in_at) return NextResponse.json({ error: "Checked-in tickets cannot be cancelled." }, { status: 400 });

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
  const refundAmountCents = calculateRefundAmount(ticketType?.price_cents ?? 0, event.start_time);

  const { data: createdRequest, error: createError } = await supabase
    .from("ticket_cancellation_requests")
    .insert({
      event_id: ticket.event_id,
      ticket_id: ticket.id,
      attendee_id: attendeeId,
      reason,
      refund_amount_cents: refundAmountCents,
      refund_mode: "manual",
    })
    .select()
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
  return NextResponse.json({ ok: true, request: createdRequest });
}
