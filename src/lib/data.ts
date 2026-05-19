import { createServiceSupabaseClient, hasSupabaseEnv } from "./supabase";
import { mockDashboard, mockEvent, mockMenuItems, mockProfiles, mockTransactions, mockWallet } from "./mock-data";
import type { BartenderShift, BartenderShiftSummary, DashboardMetrics, EventBartender, EventRecord, MenuItem, Transaction, Wallet } from "./types";

export async function getEvents(): Promise<EventRecord[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [mockEvent];
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").order("start_time", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEvent(eventId: string): Promise<EventRecord | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockEvent;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
  if (error) return null;
  return data;
}

export async function getWallet(eventId: string): Promise<Wallet | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockWallet;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("wallets").select("*").eq("event_id", eventId).limit(1).single();
  if (error) return null;
  return data;
}

export async function getWalletByToken(eventId: string, walletToken: string): Promise<Wallet | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return walletToken === mockWallet.qr_token && eventId === mockWallet.event_id ? mockWallet : null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("event_id", eventId)
    .eq("qr_token", walletToken)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getMenuItems(eventId: string): Promise<MenuItem[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockMenuItems;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("event_id", eventId)
    .eq("active", true)
    .order("category");
  if (error) throw error;
  return data ?? [];
}

export async function getOrganizerMenuItems(eventId: string): Promise<MenuItem[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockMenuItems;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("event_id", eventId)
    .order("category")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getEventBartenders(eventId: string): Promise<EventBartender[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const bartender = mockProfiles.find((profile) => profile.role === "bartender");
    return bartender
      ? [
          {
            id: "mock-bartender-member",
            event_id: mockEvent.id,
            user_id: bartender.id,
            email: "bartender@example.com",
            full_name: bartender.full_name,
            created_at: bartender.created_at,
          },
        ]
      : [];
  }

  const supabase = createServiceSupabaseClient();
  const { data: members, error: membersError } = await supabase
    .from("event_members")
    .select("id, event_id, user_id, created_at")
    .eq("event_id", eventId)
    .eq("role", "bartender")
    .order("created_at", { ascending: false });
  if (membersError) throw membersError;

  const userIds = (members ?? []).map((member) => member.user_id);
  if (!userIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("users_profile")
    .select("id, full_name")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const authUsers = await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      return data.user;
    }),
  );
  const emailById = new Map(authUsers.filter((user) => user !== null).map((user) => [user.id, user.email ?? null]));

  return (members ?? []).map((member) => ({
    id: member.id,
    event_id: member.event_id,
    user_id: member.user_id,
    email: emailById.get(member.user_id) ?? null,
    full_name: profilesById.get(member.user_id)?.full_name ?? "Bartender",
    created_at: member.created_at,
  }));
}

export async function getCurrentBartenderShift(eventId: string, bartenderId?: string | null): Promise<BartenderShift | null> {
  if (!bartenderId) return null;
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("bartender_shifts")
    .select("*")
    .eq("event_id", eventId)
    .eq("bartender_id", bartenderId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getBartenderShiftSummary(eventId: string): Promise<BartenderShiftSummary[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const bartender = mockProfiles.find((profile) => profile.role === "bartender");
    return bartender
      ? [
          {
            id: "mock-active-shift",
            event_id: mockEvent.id,
            bartender_id: bartender.id,
            bartender_name: bartender.full_name,
            bartender_email: "bartender@example.com",
            started_at: new Date().toISOString(),
            ended_at: null,
            created_at: new Date().toISOString(),
          },
        ]
      : [];
  }

  const supabase = createServiceSupabaseClient();
  const { data: shifts, error: shiftsError } = await supabase
    .from("bartender_shifts")
    .select("*")
    .eq("event_id", eventId)
    .order("started_at", { ascending: false })
    .limit(20);
  if (shiftsError) return [];

  const bartenderIds = Array.from(new Set((shifts ?? []).map((shift) => shift.bartender_id)));
  if (!bartenderIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("users_profile")
    .select("id, full_name")
    .in("id", bartenderIds);
  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const authUsers = await Promise.all(
    bartenderIds.map(async (userId) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      return data.user;
    }),
  );
  const emailById = new Map(authUsers.filter((user) => user !== null).map((user) => [user.id, user.email ?? null]));

  return (shifts ?? []).map((shift) => ({
    ...shift,
    bartender_name: profilesById.get(shift.bartender_id)?.full_name ?? "Bartender",
    bartender_email: emailById.get(shift.bartender_id) ?? null,
  }));
}

export async function getTransactions(eventId: string): Promise<Transaction[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockTransactions;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDashboardMetrics(eventId: string): Promise<DashboardMetrics> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockDashboard;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("get_event_dashboard", { p_event_id: eventId }).single();
  if (error) throw error;
  return data as DashboardMetrics;
}
