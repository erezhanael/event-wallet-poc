import { NextResponse } from "next/server";
import { roleHome } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};

export async function POST(request: Request) {
  const { accessToken } = (await request.json()) as { accessToken?: string };

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid Supabase session" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users_profile")
    .select("id, role, full_name, created_at")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User profile was not found" }, { status: 403 });
  }

  const role = profile.role as UserRole;
  const response = NextResponse.json({ role, redirectTo: roleHome[role], fullName: profile.full_name });
  response.cookies.set("event_wallet_user_id", user.id, cookieOptions);
  response.cookies.set("event_wallet_role", role, cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("event_wallet_user_id", "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set("event_wallet_role", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
