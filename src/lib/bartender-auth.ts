import { cookies } from "next/headers";
import { createServiceSupabaseClient, hasSupabaseEnv } from "./supabase";

export type BartenderAuthResult =
  | { ok: true; mock: boolean; userId: string | null }
  | { ok: false; status: number; error: string };

export async function requireBartenderForEvent(eventId: string): Promise<BartenderAuthResult> {
  const cookieStore = await cookies();
  const role = cookieStore.get("event_wallet_role")?.value;
  const userId = cookieStore.get("event_wallet_user_id")?.value ?? null;

  if (role !== "bartender") {
    return { ok: false, status: 403, error: "Bartender access is required" };
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, mock: true, userId };
  }

  if (!userId) {
    return { ok: false, status: 401, error: "Missing bartender session" };
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("role", "bartender")
    .single();

  if (error || !data) {
    return { ok: false, status: 403, error: "Bartender is not assigned to this event" };
  }

  return { ok: true, mock: false, userId };
}
