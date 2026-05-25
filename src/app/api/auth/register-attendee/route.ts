import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};

export async function POST(request: Request) {
  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!eventId || !fullName || !email || password.length < 6) {
    return NextResponse.json({ error: "Add name, email, and a password with at least 6 characters." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "attendee" },
  });

  if (createError) {
    if (createError.code === "email_exists") {
      return NextResponse.json({ error: "This email already has an account. Please log in to continue." }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Could not create attendee user." }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("users_profile").upsert({
    id: userId,
    role: "attendee",
    full_name: fullName,
  });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  const { error: memberError } = await supabase.from("event_members").upsert(
    {
      event_id: eventId,
      user_id: userId,
      role: "attendee",
    },
    { onConflict: "event_id,user_id" },
  );
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });

  const { error: walletError } = await supabase.from("wallets").upsert(
    {
      event_id: eventId,
      user_id: userId,
      balance_cents: 0,
      status: "active",
    },
    { onConflict: "event_id,user_id" },
  );
  if (walletError) return NextResponse.json({ error: walletError.message }, { status: 400 });

  const response = NextResponse.json({ ok: true, role: "attendee", redirectTo: `/attendee/events/${eventId}/tickets` });
  response.cookies.set("event_wallet_user_id", userId, cookieOptions);
  response.cookies.set("event_wallet_role", "attendee", cookieOptions);
  return response;
}
