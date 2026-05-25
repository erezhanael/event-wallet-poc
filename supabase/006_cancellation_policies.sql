create table if not exists public.cancellation_policies (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade unique,
  enabled boolean not null default true,
  full_refund_until_hours integer not null default 48 check (full_refund_until_hours >= 0),
  partial_refund_until_hours integer not null default 24 check (partial_refund_until_hours >= 0),
  partial_refund_percent integer not null default 50 check (partial_refund_percent >= 0 and partial_refund_percent <= 100),
  refund_mode text not null default 'manual' check (refund_mode in ('manual', 'wallet_credit', 'original_payment')),
  requires_approval boolean not null default true,
  block_after_checkin boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (full_refund_until_hours >= partial_refund_until_hours)
);

create index if not exists idx_cancellation_policies_event on public.cancellation_policies(event_id);

alter table public.cancellation_policies enable row level security;

drop policy if exists "cancellation_policies_select_members_or_organizer" on public.cancellation_policies;
create policy "cancellation_policies_select_members_or_organizer" on public.cancellation_policies
  for select using (public.is_event_member(event_id) or public.is_event_organizer(event_id));

drop policy if exists "cancellation_policies_write_organizer" on public.cancellation_policies;
create policy "cancellation_policies_write_organizer" on public.cancellation_policies
  for all using (public.is_event_organizer(event_id)) with check (public.is_event_organizer(event_id));
