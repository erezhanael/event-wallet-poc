export type UserRole = "attendee" | "bartender" | "organizer" | "checkin" | "vendor";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
};

export type EventRecord = {
  id: string;
  organizer_id: string;
  name: string;
  event_code: string;
  start_time: string;
  end_time: string;
  currency: string;
  created_at: string;
};

export type Wallet = {
  id: string;
  event_id: string;
  user_id: string;
  balance_cents: number;
  qr_token: string;
  status: "active" | "blocked";
  created_at: string;
};

export type MenuItem = {
  id: string;
  event_id: string;
  vendor_id?: string | null;
  name: string;
  price_cents: number;
  category: string;
  active: boolean;
};

export type EventBartender = {
  id: string;
  event_id: string;
  user_id: string;
  email: string | null;
  full_name: string;
  created_at: string;
};

export type EventVendor = {
  id: string;
  event_id: string;
  user_id: string;
  email: string | null;
  full_name: string;
  vendor_name: string;
  station_id: string | null;
  station_name: string | null;
  station_type: PosStation["station_type"] | null;
  monitor_slug: string | null;
  pairing_code: string | null;
  created_at: string;
};

export type BartenderShift = {
  id: string;
  event_id: string;
  bartender_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type BartenderShiftSummary = BartenderShift & {
  bartender_name: string;
  bartender_email: string | null;
};

export type PosStation = {
  id: string;
  event_id: string;
  vendor_id?: string | null;
  name: string;
  station_type: "bar" | "food" | "merch" | "other";
  pairing_code: string;
  monitor_slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StationSession = {
  id: string;
  event_id: string;
  station_id: string;
  staff_user_id: string;
  monitor_device_id: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  event_id: string;
  wallet_id: string;
  bartender_id: string | null;
  type: "topup" | "purchase" | "refund" | "adjustment";
  amount_cents: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  quantity_total: number;
  quantity_sold: number;
  active: boolean;
  sales_start: string | null;
  sales_end: string | null;
  created_at: string;
};

export type Ticket = {
  id: string;
  event_id: string;
  ticket_type_id: string;
  attendee_id: string;
  ticket_token: string;
  status: "active" | "checked_in" | "cancelled" | "refunded";
  purchased_at: string;
  checked_in_at: string | null;
  original_price_cents: number;
  discount_cents: number;
  paid_amount_cents: number;
  promo_code_id: string | null;
  ticket_type?: TicketType;
};

export type TicketPromotion = {
  id: string;
  event_id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed" | "free";
  discount_value: number;
  eligible_emails: string[];
  max_redemptions: number | null;
  redeemed_count: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketCancellationRequest = {
  id: string;
  event_id: string;
  ticket_id: string;
  attendee_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  refund_amount_cents: number;
  refund_mode: "manual" | "wallet_credit" | "original_payment";
  organizer_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  ticket?: Ticket;
  attendee_name?: string | null;
  reviewer_name?: string | null;
};

export type RefundRecord = {
  id: string;
  event_id: string;
  ticket_id: string;
  cancellation_request_id: string | null;
  attendee_id: string;
  amount_cents: number;
  method: "manual" | "wallet_credit" | "original_payment";
  status: "pending" | "completed" | "failed";
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type CancellationPolicy = {
  id: string;
  event_id: string;
  enabled: boolean;
  full_refund_until_hours: number;
  partial_refund_until_hours: number;
  partial_refund_percent: number;
  refund_mode: "manual" | "wallet_credit" | "original_payment";
  requires_approval: boolean;
  block_after_checkin: boolean;
  created_at: string;
  updated_at: string;
};

export type AttendeeCheckInStatus = {
  id: string;
  event_id: string;
  attendee_id: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  nfc_tag_uid: string | null;
  nfc_wallet_id: string | null;
  nfc_assigned_at: string | null;
  nfc_assigned_by: string | null;
  nfc_status: "active" | "replaced" | "lost" | "blocked" | null;
  replaced_from_tag_uid: string | null;
  created_at: string;
  updated_at: string;
};

export type NfcAssignmentLog = {
  id: string;
  event_id: string;
  attendee_id: string;
  wallet_id: string;
  tag_uid: string;
  action: "assigned" | "replaced" | "blocked" | "lost";
  staff_user_id: string;
  timestamp: string;
  device_id: string | null;
  sync_status: "synced" | "pending" | "conflict";
};

export type PurchaseItem = {
  id: string;
  transaction_id: string;
  menu_item_id: string;
  quantity: number;
  price_cents: number;
};

export type DashboardMetrics = {
  totalPrepaidCents: number;
  totalSpentCents: number;
  outstandingCents: number;
  transactionCount: number;
  attendeeCount: number;
  topItems: Array<{ name: string; quantity: number; revenueCents: number }>;
  hourlySales: Array<{ hour: string; salesCents: number }>;
};

export type TicketSalesDashboard = {
  totalCapacity: number;
  totalSold: number;
  activeTickets: number;
  checkedInTickets: number;
  cancelledTickets: number;
  refundedTickets: number;
  grossSalesCents: number;
  netSalesCents: number;
  discountCents: number;
  refundExposureCents: number;
  averagePaidCents: number;
  ticketTypeSales: Array<{
    id: string;
    name: string;
    quantityTotal: number;
    soldCount: number;
    activeCount: number;
    cancelledCount: number;
    promoCount: number;
    revenueCents: number;
    discountCents: number;
  }>;
  promoSales: Array<{
    id: string;
    code: string;
    kind: "full_price" | TicketPromotion["discount_type"];
    soldCount: number;
    revenueCents: number;
    discountCents: number;
  }>;
  cancellationReasons: Array<{
    reason: string;
    count: number;
    refundCents: number;
  }>;
  cancellationStatuses: Array<{
    status: TicketCancellationRequest["status"];
    count: number;
  }>;
};
