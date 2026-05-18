import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOrganizerForEvent } from "@/lib/organizer-auth";
import { createServiceSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

type BartenderInput = {
  email?: string;
};

function cleanEmail(input: BartenderInput) {
  const email = input.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "A valid bartender email is required" };
  }

  return { email };
}

function fullNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "bartender";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Bartender";
}

function temporaryPassword() {
  return `Bar-${randomBytes(4).toString("hex")}-2026`;
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
  const cleaned = cleanEmail((await request.json()) as BartenderInput);
  if ("error" in cleaned) {
    return NextResponse.json({ error: cleaned.error }, { status: 400 });
  }

  const auth = await requireOrganizerForEvent(eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.mock || !hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      member: {
        id: `mock-member-${Date.now()}`,
        event_id: eventId,
        user_id: `mock-bartender-${Date.now()}`,
        email: cleaned.email,
        full_name: fullNameFromEmail(cleaned.email),
        created_at: new Date().toISOString(),
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
        user_metadata: { full_name: fullNameFromEmail(cleaned.email), role: "bartender" },
      })
    ).data.user;

  if (!user) {
    return NextResponse.json({ error: "Could not create bartender user" }, { status: 400 });
  }

  const { data: profile } = await supabase.from("users_profile").select("role, full_name").eq("id", user.id).single<{
    role: UserRole;
    full_name: string;
  }>();

  if (profile && profile.role !== "bartender") {
    return NextResponse.json({ error: `This email already belongs to a ${profile.role} user` }, { status: 409 });
  }

  const fullName = profile?.full_name ?? fullNameFromEmail(cleaned.email);
  const { error: profileError } = await supabase.from("users_profile").upsert({
    id: user.id,
    role: "bartender",
    full_name: fullName,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("event_members")
    .upsert(
      {
        event_id: eventId,
        user_id: user.id,
        role: "bartender",
      },
      { onConflict: "event_id,user_id" },
    )
    .select("id, event_id, user_id, created_at")
    .single();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({
    member: {
      ...member,
      email: cleaned.email,
      full_name: fullName,
    },
    createdUser: !existingUser,
    temporaryPassword: password,
  });
}
