import type {
  DashboardMetrics,
  EventRecord,
  MenuItem,
  Profile,
  Ticket,
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
  { id: "m1", event_id: mockEvent.id, name: "Goldstar", price_cents: 2800, category: "Beer", active: true },
  { id: "m2", event_id: mockEvent.id, name: "Arak Lemonade", price_cents: 4200, category: "Cocktail", active: true },
  { id: "m3", event_id: mockEvent.id, name: "Vodka Soda", price_cents: 4600, category: "Cocktail", active: true },
  { id: "m4", event_id: mockEvent.id, name: "Mineral Water", price_cents: 1200, category: "Soft", active: true },
  { id: "m5", event_id: mockEvent.id, name: "Energy Drink", price_cents: 1800, category: "Soft", active: true },
  { id: "m6", event_id: mockEvent.id, name: "House Shot", price_cents: 2200, category: "Shot", active: true },
];

export const mockTicketTypes: TicketType[] = [
  {
    id: "ticket-type-ga",
    event_id: mockEvent.id,
    name: "General Admission",
    description: "Rooftop entry with wallet access.",
    price_cents: 6500,
    quantity_total: 200,
    quantity_sold: 1,
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
    quantity_sold: 0,
    active: true,
    sales_start: null,
    sales_end: null,
    created_at: new Date().toISOString(),
  },
];

export const mockTickets: Ticket[] = [
  {
    id: "ticket-demo-noam",
    event_id: mockEvent.id,
    ticket_type_id: mockTicketTypes[0].id,
    attendee_id: mockProfiles[1].id,
    ticket_token: "ticket_demo_neon_2026_noam",
    status: "active",
    purchased_at: new Date().toISOString(),
    checked_in_at: null,
    ticket_type: mockTicketTypes[0],
  },
];

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
