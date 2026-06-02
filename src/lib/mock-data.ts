import type {
  DashboardMetrics,
  CancellationPolicy,
  EventRecord,
  MenuItem,
  PosStation,
  Profile,
  TicketCancellationRequest,
  Ticket,
  TicketPromotion,
  TicketType,
  Transaction,
  Wallet,
} from "./types";

export const mockProfiles: Profile[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    role: "organizer",
    full_name: "Maya Organizer",
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    role: "attendee",
    full_name: "Noam Attendee",
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    role: "bartender",
    full_name: "Dana Bar",
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    role: "vendor",
    full_name: "Ari Tacos",
    created_at: new Date().toISOString(),
  },
];

export const mockEvent: EventRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  organizer_id: mockProfiles[0].id,
  name: "Neon Rooftop Friday",
  event_code: "NEON-2026",
  start_time: "2026-06-05T19:00:00.000Z",
  end_time: "2026-06-06T02:00:00.000Z",
  currency: "ILS",
  created_at: new Date().toISOString(),
};

export const mockWallet: Wallet = {
  id: "22222222-2222-4222-8222-222222222222",
  event_id: mockEvent.id,
  user_id: mockProfiles[1].id,
  balance_cents: 8500,
  qr_token: "wallet_demo_neon_2026_noam",
  status: "active",
  created_at: new Date().toISOString(),
};

export const mockMenuItems: MenuItem[] = [
  { id: "m1", event_id: mockEvent.id, vendor_id: null, name: "Goldstar", price_cents: 2800, category: "Beer", active: true },
  { id: "m2", event_id: mockEvent.id, vendor_id: null, name: "Arak Lemonade", price_cents: 4200, category: "Cocktail", active: true },
  { id: "m3", event_id: mockEvent.id, vendor_id: null, name: "Vodka Soda", price_cents: 4600, category: "Cocktail", active: true },
  { id: "m4", event_id: mockEvent.id, vendor_id: null, name: "Mineral Water", price_cents: 1200, category: "Soft", active: true },
  { id: "m5", event_id: mockEvent.id, vendor_id: null, name: "Energy Drink", price_cents: 1800, category: "Soft", active: true },
  { id: "m6", event_id: mockEvent.id, vendor_id: null, name: "House Shot", price_cents: 2200, category: "Shot", active: true },
  { id: "m7", event_id: mockEvent.id, vendor_id: mockProfiles[3].id, name: "Taco Plate", price_cents: 5200, category: "Food", active: true },
  { id: "m8", event_id: mockEvent.id, vendor_id: mockProfiles[3].id, name: "Loaded Fries", price_cents: 3600, category: "Food", active: true },
];

export const mockStations: PosStation[] = [
  {
    id: "station-main-bar",
    event_id: mockEvent.id,
    vendor_id: null,
    name: "Main Bar",
    station_type: "bar",
    pairing_code: "4821",
    monitor_slug: "main-bar",
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "station-food-truck",
    event_id: mockEvent.id,
    vendor_id: mockProfiles[3].id,
    name: "Food Truck",
    station_type: "food",
    pairing_code: "9136",
    monitor_slug: "food-truck",
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockTicketTypes: TicketType[] = [
  {
    id: "ticket-type-ga",
    event_id: mockEvent.id,
    name: "General Admission",
    description: "Rooftop entry with wallet access.",
    price_cents: 6500,
    quantity_total: 200,
    quantity_sold: 118,
    active: true,
    sales_start: null,
    sales_end: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "ticket-type-vip",
    event_id: mockEvent.id,
    name: "VIP",
    description: "Priority entry and VIP wristband.",
    price_cents: 14000,
    quantity_total: 50,
    quantity_sold: 34,
    active: true,
    sales_start: null,
    sales_end: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "ticket-type-early",
    event_id: mockEvent.id,
    name: "Early Bird",
    description: "Limited first-release rooftop entry.",
    price_cents: 4900,
    quantity_total: 80,
    quantity_sold: 80,
    active: false,
    sales_start: null,
    sales_end: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "ticket-type-guest",
    event_id: mockEvent.id,
    name: "Guest List",
    description: "Producer and partner invite allocation.",
    price_cents: 0,
    quantity_total: 30,
    quantity_sold: 18,
    active: true,
    sales_start: null,
    sales_end: null,
    created_at: new Date().toISOString(),
  },
];

export const mockTicketPromotions: TicketPromotion[] = [
  {
    id: "promo-neon-friends",
    event_id: mockEvent.id,
    code: "NEON25",
    description: "Friends and early community list.",
    discount_type: "percent",
    discount_value: 25,
    eligible_emails: [],
    max_redemptions: 60,
    redeemed_count: 42,
    active: true,
    starts_at: null,
    ends_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "promo-vip-comp",
    event_id: mockEvent.id,
    code: "PRODUCER100",
    description: "Producer comps and partner tickets.",
    discount_type: "free",
    discount_value: 0,
    eligible_emails: [],
    max_redemptions: 20,
    redeemed_count: 14,
    active: true,
    starts_at: null,
    ends_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function makeMockTickets(ticketType: TicketType, count: number, options: { prefix: string; checkedIn?: number; cancelled?: number; refunded?: number; promoEvery?: number; promoId?: string; discountCents?: number }) {
  return Array.from({ length: count }, (_, index): Ticket => {
    const sequence = index + 1;
    const isCancelled = sequence <= (options.cancelled ?? 0);
    const isRefunded = !isCancelled && sequence <= (options.cancelled ?? 0) + (options.refunded ?? 0);
    const isCheckedIn = !isCancelled && !isRefunded && sequence <= (options.checkedIn ?? 0);
    const usesPromo = Boolean(options.promoId && options.promoEvery && sequence % options.promoEvery === 0);
    const discountCents = usesPromo ? Math.min(ticketType.price_cents, options.discountCents ?? 0) : 0;

    return {
      id: `${options.prefix}-${sequence}`,
      event_id: mockEvent.id,
      ticket_type_id: ticketType.id,
      attendee_id: mockProfiles[1].id,
      ticket_token: `ticket_demo_neon_2026_${options.prefix}_${sequence}`,
      status: isCancelled ? "cancelled" : isRefunded ? "refunded" : isCheckedIn ? "checked_in" : "active",
      purchased_at: `2026-05-${String(12 + (sequence % 18)).padStart(2, "0")}T${String(12 + (sequence % 8)).padStart(2, "0")}:20:00.000Z`,
      checked_in_at: isCheckedIn ? "2026-06-05T19:35:00.000Z" : null,
      original_price_cents: ticketType.price_cents,
      discount_cents: discountCents,
      paid_amount_cents: Math.max(0, ticketType.price_cents - discountCents),
      promo_code_id: usesPromo ? options.promoId ?? null : null,
      ticket_type: ticketType,
    };
  });
}

export const mockTickets: Ticket[] = [
  ...makeMockTickets(mockTicketTypes[0], 118, { prefix: "ga", checkedIn: 22, cancelled: 7, refunded: 2, promoEvery: 4, promoId: "promo-neon-friends", discountCents: 1625 }),
  ...makeMockTickets(mockTicketTypes[1], 34, { prefix: "vip", checkedIn: 11, cancelled: 3, promoEvery: 6, promoId: "promo-vip-comp", discountCents: 14000 }),
  ...makeMockTickets(mockTicketTypes[2], 80, { prefix: "early", checkedIn: 29, cancelled: 5, refunded: 1, promoEvery: 5, promoId: "promo-neon-friends", discountCents: 1225 }),
  ...makeMockTickets(mockTicketTypes[3], 18, { prefix: "guest", checkedIn: 6, cancelled: 1, promoEvery: 1, promoId: "promo-vip-comp", discountCents: 0 }),
];

export const mockTicketCancellationRequests: TicketCancellationRequest[] = [
  {
    id: "cancel-weather-1",
    event_id: mockEvent.id,
    ticket_id: "ga-1",
    attendee_id: mockProfiles[1].id,
    reason: "Weather concern",
    status: "approved",
    refund_amount_cents: 4875,
    refund_mode: "manual",
    organizer_note: "Approved before event week.",
    reviewed_by: mockProfiles[0].id,
    reviewed_at: "2026-05-29T10:30:00.000Z",
    created_at: "2026-05-28T18:10:00.000Z",
    updated_at: "2026-05-29T10:30:00.000Z",
    ticket: mockTickets.find((ticket) => ticket.id === "ga-1"),
    attendee_name: "Noam Attendee",
    reviewer_name: "Maya Organizer",
  },
  {
    id: "cancel-sick-1",
    event_id: mockEvent.id,
    ticket_id: "vip-1",
    attendee_id: mockProfiles[1].id,
    reason: "Sick / cannot attend",
    status: "pending",
    refund_amount_cents: 14000,
    refund_mode: "original_payment",
    organizer_note: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-05-31T13:45:00.000Z",
    updated_at: "2026-05-31T13:45:00.000Z",
    ticket: mockTickets.find((ticket) => ticket.id === "vip-1"),
    attendee_name: "Noam Attendee",
    reviewer_name: null,
  },
  {
    id: "cancel-plans-1",
    event_id: mockEvent.id,
    ticket_id: "early-1",
    attendee_id: mockProfiles[1].id,
    reason: "Schedule conflict",
    status: "approved",
    refund_amount_cents: 3675,
    refund_mode: "wallet_credit",
    organizer_note: "Credited wallet.",
    reviewed_by: mockProfiles[0].id,
    reviewed_at: "2026-05-27T09:05:00.000Z",
    created_at: "2026-05-26T22:00:00.000Z",
    updated_at: "2026-05-27T09:05:00.000Z",
    ticket: mockTickets.find((ticket) => ticket.id === "early-1"),
    attendee_name: "Noam Attendee",
    reviewer_name: "Maya Organizer",
  },
  {
    id: "cancel-payment-1",
    event_id: mockEvent.id,
    ticket_id: "ga-2",
    attendee_id: mockProfiles[1].id,
    reason: "Bought wrong ticket tier",
    status: "rejected",
    refund_amount_cents: 0,
    refund_mode: "manual",
    organizer_note: "Asked attendee to transfer ticket.",
    reviewed_by: mockProfiles[0].id,
    reviewed_at: "2026-05-30T16:20:00.000Z",
    created_at: "2026-05-30T15:40:00.000Z",
    updated_at: "2026-05-30T16:20:00.000Z",
    ticket: mockTickets.find((ticket) => ticket.id === "ga-2"),
    attendee_name: "Noam Attendee",
    reviewer_name: "Maya Organizer",
  },
];

export const mockCancellationPolicy: CancellationPolicy = {
  id: "policy-demo-neon",
  event_id: mockEvent.id,
  enabled: true,
  full_refund_until_hours: 48,
  partial_refund_until_hours: 24,
  partial_refund_percent: 50,
  refund_mode: "manual",
  requires_approval: true,
  block_after_checkin: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockTransactions: Transaction[] = [
  {
    id: "t1",
    event_id: mockEvent.id,
    wallet_id: mockWallet.id,
    bartender_id: null,
    type: "topup",
    amount_cents: 15000,
    metadata: { stripe_session_id: "cs_test_mock" },
    created_at: "2026-06-05T17:15:00.000Z",
  },
  {
    id: "t2",
    event_id: mockEvent.id,
    wallet_id: mockWallet.id,
    bartender_id: mockProfiles[2].id,
    type: "purchase",
    amount_cents: -4600,
    metadata: { items: [{ name: "Vodka Soda", quantity: 1 }] },
    created_at: "2026-06-05T21:10:00.000Z",
  },
  {
    id: "t3",
    event_id: mockEvent.id,
    wallet_id: mockWallet.id,
    bartender_id: mockProfiles[2].id,
    type: "purchase",
    amount_cents: -1900,
    metadata: { items: [{ name: "Mineral Water", quantity: 1 }, { name: "Tip", quantity: 1 }] },
    created_at: "2026-06-05T22:35:00.000Z",
  },
];

export const mockDashboard: DashboardMetrics = {
  totalPrepaidCents: 428000,
  totalSpentCents: 271400,
  outstandingCents: 156600,
  transactionCount: 184,
  attendeeCount: 96,
  topItems: [
    { name: "Goldstar", quantity: 83, revenueCents: 232400 },
    { name: "Vodka Soda", quantity: 47, revenueCents: 216200 },
    { name: "Arak Lemonade", quantity: 31, revenueCents: 130200 },
  ],
  hourlySales: [
    { hour: "19:00", salesCents: 18000 },
    { hour: "20:00", salesCents: 42600 },
    { hour: "21:00", salesCents: 73900 },
    { hour: "22:00", salesCents: 88100 },
    { hour: "23:00", salesCents: 49200 },
  ],
};
