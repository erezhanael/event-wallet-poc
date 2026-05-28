import { createServiceSupabaseClient, hasSupabaseEnv } from "./supabase";
import { mockCancellationPolicy, mockDashboard, mockEvent, mockMenuItems, mockProfiles, mockStations, mockTicketCancellationRequests, mockTicketTypes, mockTickets, mockTransactions, mockWallet } from "./mock-data";
import type { BartenderShift, BartenderShiftSummary, CancellationPolicy, DashboardMetrics, EventBartender, EventRecord, MenuItem, PosStation, Profile, Ticket, TicketCancellationRequest, TicketPromotion, TicketType, Transaction, Wallet } from "./types";

export type PublicEventSummary = EventRecord & {
  ticketTypes: TicketType[];
  lowestTicketPriceCents: number | null;
  ticketsAvailable: number;
};

export const defaultCancellationPolicy = {
  enabled: true,
  full_refund_until_hours: 48,
  partial_refund_until_hours: 24,
  partial_refund_percent: 50,
  refund_mode: "manual" as const,
  requires_approval: true,
  block_after_checkin: true,
};

export async function getProfile(userId?: string | null): Promise<Profile | null> {
  if (!userId) return null;
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockProfiles.find((profile) => profile.id === userId) ?? mockProfiles[1] ?? null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("users_profile")
    .select("id, role, full_name, created_at")
    .eq("id", userId)
    .maybeSingle<Profile>();
  if (error) return null;
  return data;
}

export async function getEvents(): Promise<EventRecord[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [mockEvent];
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").order("start_time", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPublicEventSummaries(): Promise<PublicEventSummary[]> {
  const events = await getEvents();
  const upcomingEvents = events
    .filter((event) => new Date(event.end_time).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const summaries = await Promise.all(
    upcomingEvents.map(async (event) => {
      const ticketTypes = await getTicketTypes(event.id).catch(() => []);
      const availableTicketTypes = ticketTypes.filter((ticketType) => ticketType.active);
      const prices = availableTicketTypes.map((ticketType) => ticketType.price_cents);

      return {
        ...event,
        ticketTypes: availableTicketTypes,
        lowestTicketPriceCents: prices.length ? Math.min(...prices) : null,
        ticketsAvailable: availableTicketTypes.reduce(
          (sum, ticketType) => sum + Math.max(0, ticketType.quantity_total - ticketType.quantity_sold),
          0,
        ),
      };
    }),
  );

  return summaries;
}

export async function getEvent(eventId: string): Promise<EventRecord | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockEvent;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
  if (error) return null;
  return data;
}

export async function getWallet(eventId: string, userId?: string | null): Promise<Wallet | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockWallet;
  const supabase = createServiceSupabaseClient();
  let query = supabase.from("wallets").select("*").eq("event_id", eventId);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.maybeSingle();
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

export async function getWalletByNfcTag(eventId: string, tagUid: string, walletId?: string | null): Promise<(Wallet & { attendee_name?: string | null; nfc_status?: string | null }) | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return tagUid ? { ...mockWallet, attendee_name: "Noam Attendee", nfc_status: "active" } : null;
  }

  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from("attendee_checkins")
    .select("nfc_status, nfc_wallet_id, attendee:users_profile(full_name), wallet:wallets(*)")
    .eq("event_id", eventId)
    .eq("nfc_tag_uid", tagUid);

  if (walletId) query = query.eq("nfc_wallet_id", walletId);
  const { data, error } = await query.maybeSingle();
  if (error || !data || data.nfc_status !== "active") return null;

  const wallet = Array.isArray(data.wallet) ? data.wallet[0] : data.wallet;
  const attendee = Array.isArray(data.attendee) ? data.attendee[0] : data.attendee;
  return wallet ? { ...wallet, attendee_name: attendee?.full_name ?? null, nfc_status: data.nfc_status } : null;
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

export async function getEventStations(eventId: string, includeInactive = true): Promise<PosStation[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockStations.filter((station) => station.event_id === eventId && (includeInactive || station.active));
  }

  const supabase = createServiceSupabaseClient();
  let query = supabase.from("pos_stations").select("*").eq("event_id", eventId).order("created_at", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getStationByMonitorSlug(eventId: string, monitorSlug: string): Promise<PosStation | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockStations.find((station) => station.event_id === eventId && station.monitor_slug === monitorSlug) ?? null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("pos_stations")
    .select("*")
    .eq("event_id", eventId)
    .eq("monitor_slug", monitorSlug)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getTicketTypes(eventId: string, includeInactive = false): Promise<TicketType[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockTicketTypes.filter((ticketType) => ticketType.event_id === eventId && (includeInactive || ticketType.active));
  }

  const supabase = createServiceSupabaseClient();
  let query = supabase.from("ticket_types").select("*").eq("event_id", eventId).order("created_at", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTicketPromotions(eventId: string): Promise<TicketPromotion[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ticket_promotions")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAttendeeTickets(eventId: string, attendeeId?: string | null): Promise<Ticket[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockTickets.filter((ticket) => ticket.event_id === eventId);
  }
  if (!attendeeId) return [];

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, ticket_type:ticket_types(*)")
    .eq("event_id", eventId)
    .eq("attendee_id", attendeeId)
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTicketCancellationRequests(eventId: string, attendeeId?: string | null): Promise<TicketCancellationRequest[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockTicketCancellationRequests.filter((request) => request.event_id === eventId && (!attendeeId || request.attendee_id === attendeeId));
  }

  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from("ticket_cancellation_requests")
    .select("*, ticket:tickets(*, ticket_type:ticket_types(*))")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (attendeeId) query = query.eq("attendee_id", attendeeId);

  const { data, error } = await query;
  if (error) throw error;

  const requests = (data ?? []) as TicketCancellationRequest[];
  const profileIds = Array.from(
    new Set(requests.flatMap((request) => [request.attendee_id, request.reviewed_by]).filter((id): id is string => Boolean(id))),
  );
  if (!profileIds.length) return requests;

  const { data: profiles, error: profilesError } = await supabase
    .from("users_profile")
    .select("id, full_name")
    .in("id", profileIds);
  if (profilesError) throw profilesError;

  const namesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  return requests.map((request) => ({
    ...request,
    attendee_name: namesById.get(request.attendee_id) ?? null,
    reviewer_name: request.reviewed_by ? namesById.get(request.reviewed_by) ?? null : null,
  }));
}

export async function getCancellationPolicy(eventId: string): Promise<CancellationPolicy | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockCancellationPolicy;
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("cancellation_policies")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getTicketByToken(ticketToken: string): Promise<Ticket | null> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockTickets.find((ticket) => ticket.ticket_token === ticketToken) ?? null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, ticket_type:ticket_types(*)")
    .eq("ticket_token", ticketToken)
    .maybeSingle();
  if (error) return null;
  return data;
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

export async function getTransactions(eventId: string, walletId?: string | null): Promise<Transaction[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return mockTransactions;
  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (walletId) query = query.eq("wallet_id", walletId);
  const { data, error } = await query;
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
