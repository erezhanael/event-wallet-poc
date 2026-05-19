import { NextResponse } from "next/server";
import { requireBartenderForEvent } from "@/lib/bartender-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const auth = await requireBartenderForEvent(eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY || !auth.userId) {
    return NextResponse.json({
      id: `mock-shift-${Date.now()}`,
      event_id: eventId,
      bartender_id: auth.userId ?? "mock-bartender",
      started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data: activeShift, error: activeError } = await supabase
    .from("bartender_shifts")
    .select("id")
    .eq("event_id", eventId)
    .eq("bartender_id", auth.userId)
    .is("ended_at", null)
    .maybeSingle();

  if (activeError) {
    return NextResponse.json({ error: activeError.message }, { status: 400 });
  }

  if (!activeShift) {
    return NextResponse.json({ error: "No active shift found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("bartender_shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", activeShift.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
