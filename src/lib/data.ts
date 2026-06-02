import { createServiceSupabaseClient, hasSupabaseEnv } from "./supabase";
import { mockCancellationPolicy, mockDashboard, mockEvent, mockMenuItems, mockProfiles, mockStations, mockTicketCancellationRequests, mockTicketPromotions, mockTicketTypes, mockTickets, mockTransactions, mockWallet } from "./mock-data";
import type { BartenderShift, BartenderShiftSummary, CancellationPolicy, DashboardMetrics, EventBartender, EventRecord, EventVendor, MenuItem, PosStation, Profile, Ticket, TicketCancellationRequest, TicketPromotion, TicketSalesDashboard, TicketType, Transaction, Wallet } from "./types";

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

export async function getVendorMenuItems(eventId: string, vendorId?: string | null, includeInactive = true): Promise<MenuItem[]> {
  if (!vendorId) return [];
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockMenuItems.filter((item) => item.event_id === eventId && item.vendor_id === vendorId && (includeInactive || item.active));
  }

  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from("menu_items")
    .select("*")
    .eq("event_id", eventId)
    .eq("vendor_id", vendorId)
    .order("category")
    .order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return [];
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
  if (error) {
    console.warn("Could not load POS stations", error.message);
    return [];
  }
  return data ?? [];
}

export async function getVendorStations(eventId: string, vendorId?: string | null, includeInactive = true): Promise<PosStation[]> {
  if (!vendorId) return [];
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockStations.filter((station) => station.event_id === eventId && station.vendor_id === vendorId && (includeInactive || station.active));
  }

  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from("pos_stations")
    .select("*")
    .eq("event_id", eventId)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return [];
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
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockTicketPromotions.filter((promotion) => promotion.event_id === eventId);
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ticket_promotions")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function normalizeCancellationReason(reason: string) {
  const value = reason.toLowerCase();
  if (/(weather|rain|wind|cold)/.test(value)) return "Weather";
  if (/(sick|ill|covid|health|hospital)/.test(value)) return "Health";
  if (/(schedule|conflict|work|plans|family|cannot attend|can't attend)/.test(value)) return "Schedule conflict";
  if (/(wrong|mistake|tier|duplicate|double)/.test(value)) return "Purchase mistake";
  if (/(travel|flight|transport|bus|train|traffic)/.test(value)) return "Travel";
  return reason.trim() || "Other";
}

function buildTicketSalesDashboard(ticketTypes: TicketType[], tickets: Ticket[], promotions: TicketPromotion[], cancellations: TicketCancellationRequest[]): TicketSalesDashboard {
  const ticketsByType = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    const group = ticketsByType.get(ticket.ticket_type_id) ?? [];
    group.push(ticket);
    ticketsByType.set(ticket.ticket_type_id, group);
  }

  const activeStatuses = new Set<Ticket["status"]>(["active", "checked_in"]);
  const totalCapacity = ticketTypes.reduce((sum, ticketType) => sum + ticketType.quantity_total, 0);
  const grossSalesCents = tickets.reduce((sum, ticket) => sum + ticket.original_price_cents, 0);
  const netTickets = tickets.filter((ticket) => activeStatuses.has(ticket.status));
  const netSalesCents = netTickets.reduce((sum, ticket) => sum + ticket.paid_amount_cents, 0);
  const discountCents = tickets.reduce((sum, ticket) => sum + ticket.discount_cents, 0);
  const refundExposureCents = cancellations
    .filter((request) => request.status !== "rejected")
    .reduce((sum, request) => sum + request.refund_amount_cents, 0);

  const ticketTypeSales = ticketTypes.map((ticketType) => {
    const typeTickets = ticketsByType.get(ticketType.id) ?? [];
    const activeTypeTickets = typeTickets.filter((ticket) => activeStatuses.has(ticket.status));

    return {
      id: ticketType.id,
      name: ticketType.name,
      quantityTotal: ticketType.quantity_total,
      soldCount: typeTickets.length || ticketType.quantity_sold,
      activeCount: activeTypeTickets.length,
      cancelledCount: typeTickets.filter((ticket) => ticket.status === "cancelled" || ticket.status === "refunded").length,
      promoCount: typeTickets.filter((ticket) => ticket.promo_code_id).length,
      revenueCents: activeTypeTickets.reduce((sum, ticket) => sum + ticket.paid_amount_cents, 0),
      discountCents: typeTickets.reduce((sum, ticket) => sum + ticket.discount_cents, 0),
    };
  });

  const promoSales: TicketSalesDashboard["promoSales"] = promotions.map((promotion) => {
    const promoTickets = tickets.filter((ticket) => ticket.promo_code_id === promotion.id);
    const activePromoTickets = promoTickets.filter((ticket) => activeStatuses.has(ticket.status));
    return {
      id: promotion.id,
      code: promotion.code,
      kind: promotion.discount_type,
      soldCount: promoTickets.length || promotion.redeemed_count,
      revenueCents: activePromoTickets.reduce((sum, ticket) => sum + ticket.paid_amount_cents, 0),
      discountCents: promoTickets.reduce((sum, ticket) => sum + ticket.discount_cents, 0),
    };
  });

  const fullPriceTickets = tickets.filter((ticket) => !ticket.promo_code_id);
  promoSales.unshift({
    id: "full-price",
    code: "Full price",
    kind: "full_price",
    soldCount: fullPriceTickets.length,
    revenueCents: fullPriceTickets.filter((ticket) => activeStatuses.has(ticket.status)).reduce((sum, ticket) => sum + ticket.paid_amount_cents, 0),
    discountCents: 0,
  });

  const reasonMap = new Map<string, { count: number; refundCents: number }>();
  for (const request of cancellations) {
    const reason = normalizeCancellationReason(request.reason);
    const current = reasonMap.get(reason) ?? { count: 0, refundCents: 0 };
    current.count += 1;
    current.refundCents += request.refund_amount_cents;
    reasonMap.set(reason, current);
  }

  const statusOrder: TicketCancellationRequest["status"][] = ["pending", "approved", "rejected"];

  return {
    totalCapacity,
    totalSold: tickets.length || ticketTypes.reduce((sum, ticketType) => sum + ticketType.quantity_sold, 0),
    activeTickets: tickets.filter((ticket) => ticket.status === "active").length,
    checkedInTickets: tickets.filter((ticket) => ticket.status === "checked_in").length,
    cancelledTickets: tickets.filter((ticket) => ticket.status === "cancelled").length,
    refundedTickets: tickets.filter((ticket) => ticket.status === "refunded").length,
    grossSalesCents,
    netSalesCents,
    discountCents,
    refundExposureCents,
    averagePaidCents: netTickets.length ? Math.round(netSalesCents / netTickets.length) : 0,
    ticketTypeSales,
    promoSales: promoSales.filter((promo) => promo.soldCount > 0),
    cancellationReasons: Array.from(reasonMap, ([reason, value]) => ({ reason, ...value })).sort((a, b) => b.count - a.count),
    cancellationStatuses: statusOrder.map((status) => ({
      status,
      count: cancellations.filter((request) => request.status === status).length,
    })),
  };
}

export async function getTicketSalesDashboard(eventId: string): Promise<TicketSalesDashboard> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return buildTicketSalesDashboard(
      mockTicketTypes.filter((ticketType) => ticketType.event_id === eventId),
      mockTickets.filter((ticket) => ticket.event_id === eventId),
      mockTicketPromotions.filter((promotion) => promotion.event_id === eventId),
      mockTicketCancellationRequests.filter((request) => request.event_id === eventId),
    );
  }

  const supabase = createServiceSupabaseClient();
  const [{ data: ticketTypes, error: ticketTypesError }, { data: tickets, error: ticketsError }, { data: promotions, error: promotionsError }, { data: cancellations, error: cancellationsError }] = await Promise.all([
    supabase.from("ticket_types").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
    supabase.from("tickets").select("*, ticket_type:ticket_types(*)").eq("event_id", eventId).order("purchased_at", { ascending: false }),
    supabase.from("ticket_promotions").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.from("ticket_cancellation_requests").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
  ]);

  if (ticketTypesError) throw ticketTypesError;
  if (ticketsError) throw ticketsError;
  if (promotionsError) throw promotionsError;
  if (cancellationsError) throw cancellationsError;

  return buildTicketSalesDashboard(
    (ticketTypes ?? []) as TicketType[],
    (tickets ?? []) as Ticket[],
    (promotions ?? []) as TicketPromotion[],
    (cancellations ?? []) as TicketCancellationRequest[],
  );
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

export async function getEventVendors(eventId: string): Promise<EventVendor[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const vendor = mockProfiles.find((profile) => profile.role === "vendor");
    const station = mockStations.find((candidate) => candidate.event_id === eventId && candidate.vendor_id === vendor?.id);
    return vendor
      ? [
          {
            id: "mock-vendor-member",
            event_id: mockEvent.id,
            user_id: vendor.id,
            email: "vendor@example.com",
            full_name: vendor.full_name,
            vendor_name: vendor.full_name,
            station_id: station?.id ?? null,
            station_name: station?.name ?? null,
            station_type: station?.station_type ?? null,
            monitor_slug: station?.monitor_slug ?? null,
            pairing_code: station?.pairing_code ?? null,
            created_at: vendor.created_at,
          },
        ]
      : [];
  }

  const supabase = createServiceSupabaseClient();
  const { data: members, error: membersError } = await supabase
    .from("event_members")
    .select("id, event_id, user_id, created_at")
    .eq("event_id", eventId)
    .eq("role", "vendor")
    .order("created_at", { ascending: false });
  if (membersError) throw membersError;

  const userIds = (members ?? []).map((member) => member.user_id);
  if (!userIds.length) return [];

  const [{ data: profiles, error: profilesError }, { data: stations, error: stationsError }] = await Promise.all([
    supabase.from("users_profile").select("id, full_name").in("id", userIds),
    supabase.from("pos_stations").select("*").eq("event_id", eventId).in("vendor_id", userIds),
  ]);
  if (profilesError) throw profilesError;
  if (stationsError) {
    console.warn("Could not load vendor stations", stationsError.message);
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const stationByVendorId = new Map((stations ?? []).filter((station) => station.vendor_id).map((station) => [station.vendor_id, station]));
  const authUsers = await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await supabase.auth.admin.getUserById(userId);
      return data.user;
    }),
  );
  const emailById = new Map(authUsers.filter((user) => user !== null).map((user) => [user.id, user.email ?? null]));

  return (members ?? []).map((member) => {
    const station = stationByVendorId.get(member.user_id);
    const fullName = profilesById.get(member.user_id)?.full_name ?? "Vendor";
    return {
      id: member.id,
      event_id: member.event_id,
      user_id: member.user_id,
      email: emailById.get(member.user_id) ?? null,
      full_name: fullName,
      vendor_name: fullName,
      station_id: station?.id ?? null,
      station_name: station?.name ?? null,
      station_type: station?.station_type ?? null,
      monitor_slug: station?.monitor_slug ?? null,
      pairing_code: station?.pairing_code ?? null,
      created_at: member.created_at,
    };
  });
}

export async function getVendorEvents(vendorId?: string | null): Promise<EventRecord[]> {
  if (!vendorId) return [];
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return vendorId === mockProfiles.find((profile) => profile.role === "vendor")?.id ? [mockEvent] : [];
  }

  const supabase = createServiceSupabaseClient();
  const { data: members, error: membersError } = await supabase
    .from("event_members")
    .select("event_id")
    .eq("user_id", vendorId)
    .eq("role", "vendor");
  if (membersError) return [];

  const eventIds = (members ?? []).map((member) => member.event_id);
  if (!eventIds.length) return [];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .order("start_time", { ascending: false });
  if (error) return [];
  return data ?? [];
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
