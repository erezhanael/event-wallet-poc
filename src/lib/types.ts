export type UserRole = "attendee" | "bartender" | "organizer" | "checkin";

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
  ticket_type?: TicketType;
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
