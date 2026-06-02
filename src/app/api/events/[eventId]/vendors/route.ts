import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOrganizerForEvent } from "@/lib/organizer-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import type { PosStation, UserRole } from "@/lib/types";

type VendorInput = {
  email?: string;
  vendorName?: string;
  stationName?: string;
  stationType?: string;
};

const stationTypes = new Set(["bar", "food", "merch", "other"]);

function cleanInput(input: VendorInput) {
  const email = input.email?.trim().toLowerCase();
  const vendorName = input.vendorName?.trim();
  const stationName = input.stationName?.trim() || vendorName;
  const stationType = input.stationType?.trim() ?? "food";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "A valid vendor email is required." };
  if (!vendorName || vendorName.length < 2) return { error: "Vendor name must be at least 2 characters." };
  if (!stationName || stationName.length < 2) return { error: "Station name must be at least 2 characters." };
  if (!stationTypes.has(stationType)) return { error: "Choose a valid station type." };

  return { email, vendorName, stationName, stationType: stationType as PosStation["station_type"] };
}

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

function temporaryPassword() {
  return `Vendor-${randomBytes(4).toString("hex")}-2026`;
}

function pairingCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function findUserByEmail(supabase: ReturnType<typeof createServiceSupabaseClient>, email: string) {
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user || data.users.length < perPage) return user ?? null;
    page += 1;
  }

  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const cleaned = cleanInput((await request.json()) as VendorInput);
  if ("error" in cleaned) {
    return NextResponse.json({ error: cleaned.error }, { status: 400 });
  }

  const auth = await requireOrganizerForEvent(eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const now = new Date().toISOString();
  const baseSlug = slugify(cleaned.stationName);

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const userId = `mock-vendor-${Date.now()}`;
    return NextResponse.json({
      vendor: {
        id: `mock-vendor-member-${Date.now()}`,
        event_id: eventId,
        user_id: userId,
        email: cleaned.email,
        full_name: cleaned.vendorName,
        vendor_name: cleaned.vendorName,
        station_id: `mock-station-${Date.now()}`,
        station_name: cleaned.stationName,
        station_type: cleaned.stationType,
        monitor_slug: `${baseSlug}-${Date.now().toString(36)}`,
        pairing_code: pairingCode(),
        created_at: now,
      },
      createdUser: true,
      temporaryPassword: "password123",
    });
  }

  const supabase = createServiceSupabaseClient();
  const existingUser = await findUserByEmail(supabase, cleaned.email);
  const password = existingUser ? null : temporaryPassword();
  const user =
    existingUser ??
    (
      await supabase.auth.admin.createUser({
        email: cleaned.email,
        password: password ?? undefined,
        email_confirm: true,
        user_metadata: { full_name: cleaned.vendorName, role: "vendor" },
      })
    ).data.user;

  if (!user) {
    return NextResponse.json({ error: "Could not create vendor user." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("users_profile").select("role, full_name").eq("id", user.id).single<{
    role: UserRole;
    full_name: string;
  }>();

  if (profile && profile.role !== "vendor") {
    return NextResponse.json({ error: `This email already belongs to a ${profile.role} user.` }, { status: 409 });
  }

  const { error: profileError } = await supabase.from("users_profile").upsert({
    id: user.id,
    role: "vendor",
    full_name: cleaned.vendorName,
  });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  const { data: member, error: memberError } = await supabase
    .from("event_members")
    .upsert({ event_id: eventId, user_id: user.id, role: "vendor" }, { onConflict: "event_id,user_id" })
    .select("id, event_id, user_id, created_at")
    .single();

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });

  const stationPayload = {
    event_id: eventId,
    vendor_id: user.id,
    name: cleaned.stationName,
    station_type: cleaned.stationType,
    pairing_code: pairingCode(),
    monitor_slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
    active: true,
  };

  const { data: existingStation } = await supabase
    .from("pos_stations")
    .select("id")
    .eq("event_id", eventId)
    .eq("vendor_id", user.id)
    .maybeSingle();

  const stationQuery = existingStation
    ? supabase.from("pos_stations").update(stationPayload).eq("id", existingStation.id)
    : supabase.from("pos_stations").insert(stationPayload);

  const { data: station, error: stationError } = await stationQuery.select("*").single();

  if (stationError) return NextResponse.json({ error: stationError.message }, { status: 400 });

  return NextResponse.json({
    vendor: {
      ...member,
      email: cleaned.email,
      full_name: cleaned.vendorName,
      vendor_name: cleaned.vendorName,
      station_id: station.id,
      station_name: station.name,
      station_type: station.station_type,
      monitor_slug: station.monitor_slug,
      pairing_code: station.pairing_code,
    },
    createdUser: !existingUser,
    temporaryPassword: password,
  });
}
