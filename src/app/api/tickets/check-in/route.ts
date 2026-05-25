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
      ok: true,
      status: "checked_in",
      ticket_type: "General Admission",
      checked_in_at: new Date().toISOString(),
      mock: true,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("check_in_ticket", {
    p_event_id: eventId,
    p_ticket_token: ticketToken,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
