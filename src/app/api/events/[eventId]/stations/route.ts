import { NextResponse } from "next/server";
import { requireOrganizerForEvent } from "@/lib/organizer-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import type { PosStation } from "@/lib/types";

type StationInput = {
  name?: string;
  stationType?: string;
};

const stationTypes = new Set(["bar", "food", "merch", "other"]);

function slugify(input: string) {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42) || "station"
  );
}

function pairingCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function cleanStationInput(input: StationInput) {
  const name = input.name?.trim();
  const stationType = input.stationType?.trim() ?? "bar";

  if (!name || name.length < 2) {
    return { error: "Station name must be at least 2 characters." };
  }

  if (!stationTypes.has(stationType)) {
    return { error: "Choose a valid station type." };
  }

  return { name, stationType: stationType as PosStation["station_type"] };
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const cleaned = cleanStationInput((await request.json()) as StationInput);

  if ("error" in cleaned) {
    return NextResponse.json({ error: cleaned.error }, { status: 400 });
  }

  const auth = await requireOrganizerForEvent(eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const now = new Date().toISOString();
  const baseSlug = slugify(cleaned.name);

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      station: {
        id: `mock-station-${Date.now()}`,
        event_id: eventId,
        name: cleaned.name,
        station_type: cleaned.stationType,
        pairing_code: pairingCode(),
        monitor_slug: `${baseSlug}-${Date.now().toString(36)}`,
        active: true,
        created_at: now,
        updated_at: now,
      },
    });
  }

  const supabase = createServiceSupabaseClient();
  const station = {
    event_id: eventId,
    name: cleaned.name,
    station_type: cleaned.stationType,
    pairing_code: pairingCode(),
    monitor_slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
    active: true,
  };

  const { data, error } = await supabase.from("pos_stations").insert(station).select("*").single();

  if (error) {
    if (error.message.toLowerCase().includes("pos_stations")) {
      return NextResponse.json({ error: "POS stations table is not ready yet. Apply supabase/009_pos_stations.sql, then try again." }, { status: 503 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ station: data });
}
