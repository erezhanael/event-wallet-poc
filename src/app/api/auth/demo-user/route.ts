import { NextResponse } from "next/server";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

const demoUsers: Record<string, { role: string; fullName: string }> = {
  "attendee@example.com": { role: "attendee", fullName: "Noam Attendee" },
  "bartender@example.com": { role: "bartender", fullName: "Dana Bar" },
  "checkin@example.com": { role: "checkin", fullName: "Rina Check-In" },
  "vendor@example.com": { role: "vendor", fullName: "Ari Tacos" },
  "organizer@example.com": { role: "organizer", fullName: "Maya Organizer" },
};

const demoPassword = "password123";

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

function stationSlug(input: string) {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vendor"
  );
}

export async function POST(request: Request) {
  const { email: rawEmail } = (await request.json()) as { email?: string };
  const email = rawEmail?.trim().toLowerCase() ?? "";
  const demoUser = demoUsers[email];

  if (!demoUser) {
    return NextResponse.json({ error: "Only built-in demo users can be repaired from login." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, mock: true });
  }

  const supabase = createServiceSupabaseClient();
  const existingUser = await findUserByEmail(supabase, email);
  const user =
    existingUser ??
    (
      await supabase.auth.admin.createUser({
        email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: demoUser.fullName, role: demoUser.role },
      })
    ).data.user;

  if (!user) {
    return NextResponse.json({ error: "Could not create demo user." }, { status: 400 });
  }

  if (existingUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: demoUser.fullName, role: demoUser.role },
    });
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("users_profile").upsert({
    id: user.id,
    role: demoUser.role,
    full_name: demoUser.fullName,
  });

  if (profileError) {
    return NextResponse.json(
      {
        error:
          demoUser.role === "vendor"
            ? `Vendor profile could not be saved. Apply supabase/010_event_vendors.sql first. ${profileError.message}`
            : profileError.message,
      },
      { status: 400 },
    );
  }

  const { data: event } = await supabase.from("events").select("id").eq("event_code", "NEON-2026").maybeSingle();
  if (event?.id) {
    await supabase.from("event_members").upsert(
      {
        event_id: event.id,
        user_id: user.id,
        role: demoUser.role,
      },
      { onConflict: "event_id,user_id" },
    );

    if (demoUser.role === "vendor") {
      const { data: existingStation } = await supabase
        .from("pos_stations")
        .select("id")
        .eq("event_id", event.id)
        .eq("vendor_id", user.id)
        .maybeSingle();

      const stationPayload = {
        event_id: event.id,
        vendor_id: user.id,
        name: demoUser.fullName,
        station_type: "food",
        pairing_code: "7351",
        monitor_slug: stationSlug(demoUser.fullName),
        active: true,
      };

      if (existingStation) {
        await supabase.from("pos_stations").update(stationPayload).eq("id", existingStation.id);
      } else {
        await supabase.from("pos_stations").insert(stationPayload);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
