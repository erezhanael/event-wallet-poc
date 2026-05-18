import { createServiceSupabaseClient, hasSupabaseEnv } from "./supabase";
import { mockDashboard, mockEvent, mockMenuItems, mockTransactions, mockWallet } from "./mock-data";
import type { DashboardMetrics, EventRecord, MenuItem, Transaction, Wallet } from "./types";

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
