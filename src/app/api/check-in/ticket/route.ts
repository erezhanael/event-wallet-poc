import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const ticketToken = String(body.ticketToken ?? "").trim();

  if (!eventId || !ticketToken) {
    return NextResponse.json({ error: "Missing event or ticket token." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ticket: { ticket_token: ticketToken, status: "active", ticket_type: { name: "General Admission" } },
      attendee: { full_name: "Noam Attendee" },
      wallet: { id: "mock-wallet", balance_cents: 8500, status: "active" },
      checkin: null,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("*, ticket_type:ticket_types(*)")
    .eq("event_id", eventId)
    .eq("ticket_token", ticketToken)
    .maybeSingle();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const [{ data: attendee }, { data: wallet }, { data: checkin }] = await Promise.all([
    supabase.from("users_profile").select("id, full_name").eq("id", ticket.attendee_id).maybeSingle(),
    supabase.from("wallets").select("id, balance_cents, status").eq("event_id", eventId).eq("user_id", ticket.attendee_id).maybeSingle(),
    supabase.from("attendee_checkins").select("*").eq("event_id", eventId).eq("attendee_id", ticket.attendee_id).maybeSingle(),
  ]);

  return NextResponse.json({ ticket, attendee, wallet, checkin });
}
