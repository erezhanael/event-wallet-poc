import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const tagUid = String(body.tagUid ?? "").trim();
  const action = String(body.action ?? "");
  const deviceId = String(body.deviceId ?? "");
  const cookieStore = await cookies();
  const staffUserId = cookieStore.get("event_wallet_user_id")?.value;

  if (!eventId || !tagUid || !staffUserId || !["lost", "blocked"].includes(action)) {
    return NextResponse.json({ error: "Missing event, tag UID, action, or staff user." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, status: action, mock: true });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("block_nfc_wristband", {
    p_event_id: eventId,
    p_tag_uid: tagUid,
    p_action: action,
    p_device_id: deviceId || null,
    p_staff_user_id: staffUserId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
