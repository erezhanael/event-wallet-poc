import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/organizer-auth";
import { mockEvent } from "@/lib/mock-data";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type EventInput = {
  name?: string;
  eventCode?: string;
  startTime?: string;
  endTime?: string;
  currency?: string;
};

function cleanEventInput(input: EventInput) {
  const name = input.name?.trim();
  const eventCode = input.eventCode?.trim().toUpperCase();
  const currency = (input.currency?.trim().toUpperCase() || "ILS").slice(0, 3);
  const startTime = input.startTime ? new Date(input.startTime) : null;
  const endTime = input.endTime ? new Date(input.endTime) : null;

  if (!name || !eventCode || !startTime || !endTime || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: "Name, event code, start time, and end time are required" };
  }

  if (endTime <= startTime) {
    return { error: "End time must be after start time" };
  }

  return {
    name,
    eventCode,
    currency,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
}

export async function POST(request: Request) {
  const cleaned = cleanEventInput((await request.json()) as EventInput);
  if ("error" in cleaned) {
    return NextResponse.json({ error: cleaned.error }, { status: 400 });
  }

  const auth = await requireOrganizer();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY || !auth.userId) {
    return NextResponse.json({
      ...mockEvent,
      id: `mock-${Date.now()}`,
      organizer_id: auth.userId ?? mockEvent.organizer_id,
      name: cleaned.name,
      event_code: cleaned.eventCode,
      start_time: cleaned.startTime,
      end_time: cleaned.endTime,
      currency: cleaned.currency,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organizer_id: auth.userId,
      name: cleaned.name,
      event_code: cleaned.eventCode,
      start_time: cleaned.startTime,
      end_time: cleaned.endTime,
      currency: cleaned.currency,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("event_members").upsert(
    {
      event_id: event.id,
      user_id: auth.userId,
      role: "organizer",
    },
    { onConflict: "event_id,user_id" },
  );

  return NextResponse.json(event);
}
