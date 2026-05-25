import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const ticketTypeId = String(body.ticketTypeId ?? "");
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
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("issue_ticket", {
    p_event_id: eventId,
    p_ticket_type_id: ticketTypeId,
    p_attendee_id: attendeeId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
