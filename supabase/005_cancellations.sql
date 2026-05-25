create table if not exists public.ticket_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  attendee_id uuid not null references public.users_profile(id) on delete cascade,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  refund_amount_cents integer not null default 0 check (refund_amount_cents >= 0),
  refund_mode text not null default 'manual' check (refund_mode in ('manual', 'wallet_credit', 'original_payment')),
  organizer_note text,
  reviewed_by uuid references public.users_profile(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.refund_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  cancellation_request_id uuid references public.ticket_cancellation_requests(id) on delete set null,
  attendee_id uuid not null references public.users_profile(id) on delete cascade,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  method text not null default 'manual' check (method in ('manual', 'wallet_credit', 'original_payment')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  note text,
  created_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ticket_cancellation_one_pending
  on public.ticket_cancellation_requests(ticket_id)
  where status = 'pending';

create index if not exists idx_ticket_cancellation_event_status
  on public.ticket_cancellation_requests(event_id, status, created_at desc);

create index if not exists idx_refund_records_event_created
  on public.refund_records(event_id, created_at desc);

alter table public.ticket_cancellation_requests enable row level security;
alter table public.refund_records enable row level security;

drop policy if exists "ticket_cancellations_select_owner_or_organizer" on public.ticket_cancellation_requests;
create policy "ticket_cancellations_select_owner_or_organizer" on public.ticket_cancellation_requests
  for select using (
    attendee_id = auth.uid()
    or public.is_event_organizer(event_id)
  );

drop policy if exists "ticket_cancellations_insert_owner" on public.ticket_cancellation_requests;
create policy "ticket_cancellations_insert_owner" on public.ticket_cancellation_requests
  for insert with check (
    attendee_id = auth.uid()
    and exists (
      select 1
      from public.tickets t
      where t.id = ticket_id
        and t.attendee_id = auth.uid()
        and t.event_id = event_id
    )
  );

drop policy if exists "ticket_cancellations_update_organizer" on public.ticket_cancellation_requests;
create policy "ticket_cancellations_update_organizer" on public.ticket_cancellation_requests
  for update using (public.is_event_organizer(event_id)) with check (public.is_event_organizer(event_id));

drop policy if exists "refund_records_select_owner_or_organizer" on public.refund_records;
create policy "refund_records_select_owner_or_organizer" on public.refund_records
  for select using (
    attendee_id = auth.uid()
    or public.is_event_organizer(event_id)
  );

drop policy if exists "refund_records_insert_organizer" on public.refund_records;
create policy "refund_records_insert_organizer" on public.refund_records
  for insert with check (public.is_event_organizer(event_id));
