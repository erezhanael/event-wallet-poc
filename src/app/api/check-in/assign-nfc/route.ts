import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const ticketToken = String(body.ticketToken ?? "").trim();
  const tagUid = String(body.tagUid ?? "").trim();
  const deviceId = String(body.deviceId ?? "");
  const replace = Boolean(body.replace);
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("event_wallet_user_id")?.value;

  if (!eventId || !ticketToken || !tagUid || !staffUserId) {
    return NextResponse.json({ error: "Missing event, ticket, tag UID, or staff user." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: true,
      message: "Wristband assigned successfully",
      wallet_id: "mock-wallet",
      tag_uid: tagUid,
      mock: true,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("assign_nfc_wristband", {
    p_event_id: eventId,
    p_ticket_token: ticketToken,
    p_tag_uid: tagUid,
    p_device_id: deviceId || null,
    p_staff_user_id: staffUserId,
    p_replace: replace,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
