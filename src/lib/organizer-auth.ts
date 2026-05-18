import { cookies } from "next/headers";
import { createServiceSupabaseClient, hasSupabaseEnv } from "./supabase";

export type OrganizerAuthResult =
  | { ok: true; mock: boolean; userId: string | null }
  | { ok: false; status: number; error: string };

export async function requireOrganizer(): Promise<OrganizerAuthResult> {
  const cookieStore = await cookies();
  const role = cookieStore.get("event_wallet_role")?.value;
  const userId = cookieStore.get("event_wallet_user_id")?.value ?? null;

  if (role !== "organizer") {
    return { ok: false, status: 403, error: "Organizer access is required" };
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, mock: true, userId };
  }

  if (!userId) {
    return { ok: false, status: 401, error: "Missing organizer session" };
  }

  return { ok: true, mock: false, userId };
}

export async function requireOrganizerForEvent(eventId: string): Promise<OrganizerAuthResult> {
  const auth = await requireOrganizer();
  if (!auth.ok || auth.mock) return auth;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("events").select("id").eq("id", eventId).eq("organizer_id", auth.userId).single();

  if (error || !data) {
    return { ok: false, status: 403, error: "Organizer is not assigned to this event" };
  }

  return auth;
}
