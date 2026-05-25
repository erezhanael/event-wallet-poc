import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const body = await request.json();
  const action = String(body.action ?? "");
  const organizerNote = String(body.organizerNote ?? "").trim();
  const cookieStore = await cookies();
  const organizerId = cookieStore.get("event_wallet_user_id")?.value;
  const role = cookieStore.get("event_wallet_role")?.value;

  if (!requestId || !organizerId || role !== "organizer") {
    return NextResponse.json({ error: "Organizer access required." }, { status: 403 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, status: action === "approve" ? "approved" : "rejected" });
  }

  const supabase = createServiceSupabaseClient();
  const { data: cancellationRequest, error: requestError } = await supabase
    .from("ticket_cancellation_requests")
    .select("*, ticket:tickets(*), event:events(*)")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) return NextResponse.json({ error: requestError.message }, { status: 400 });
  if (!cancellationRequest) return NextResponse.json({ error: "Cancellation request not found." }, { status: 404 });
  if (cancellationRequest.status !== "pending") return NextResponse.json({ error: "This request was already reviewed." }, { status: 400 });

  const event = Array.isArray(cancellationRequest.event) ? cancellationRequest.event[0] : cancellationRequest.event;
  const ticket = Array.isArray(cancellationRequest.ticket) ? cancellationRequest.ticket[0] : cancellationRequest.ticket;
  if (event.organizer_id !== organizerId) {
    return NextResponse.json({ error: "You can only manage cancellations for your events." }, { status: 403 });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const { error: updateRequestError } = await supabase
    .from("ticket_cancellation_requests")
    .update({
      status,
      organizer_note: organizerNote || null,
      reviewed_by: organizerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (updateRequestError) return NextResponse.json({ error: updateRequestError.message }, { status: 400 });

  if (action === "approve") {
    const { error: updateTicketError } = await supabase
      .from("tickets")
      .update({ status: "cancelled" })
      .eq("id", cancellationRequest.ticket_id);
    if (updateTicketError) return NextResponse.json({ error: updateTicketError.message }, { status: 400 });

    if (ticket?.ticket_type_id) {
      const { data: ticketType, error: ticketTypeError } = await supabase
        .from("ticket_types")
        .select("quantity_sold")
        .eq("id", ticket.ticket_type_id)
        .maybeSingle();
      if (ticketTypeError) return NextResponse.json({ error: ticketTypeError.message }, { status: 400 });

      const { error: restoreInventoryError } = await supabase
        .from("ticket_types")
        .update({ quantity_sold: Math.max(0, (ticketType?.quantity_sold ?? 1) - 1) })
        .eq("id", ticket.ticket_type_id);
      if (restoreInventoryError) return NextResponse.json({ error: restoreInventoryError.message }, { status: 400 });
    }

    const { error: refundError } = await supabase.from("refund_records").insert({
      event_id: cancellationRequest.event_id,
      ticket_id: cancellationRequest.ticket_id,
      cancellation_request_id: cancellationRequest.id,
      attendee_id: cancellationRequest.attendee_id,
      amount_cents: cancellationRequest.refund_amount_cents,
      method: cancellationRequest.refund_mode,
      status: "pending",
      note: organizerNote || "Manual refund pending.",
      created_by: organizerId,
    });
    if (refundError) return NextResponse.json({ error: refundError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status });
}
