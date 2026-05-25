create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  quantity_total integer not null check (quantity_total >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  active boolean not null default true,
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz not null default now(),
  check (quantity_sold <= quantity_total),
  check (sales_end is null or sales_start is null or sales_end > sales_start)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  attendee_id uuid not null references public.users_profile(id) on delete cascade,
  ticket_token text not null unique default ('ticket_' || encode(gen_random_bytes(24), 'hex')),
  status text not null default 'active' check (status in ('active', 'checked_in', 'cancelled', 'refunded')),
  purchased_at timestamptz not null default now(),
  checked_in_at timestamptz
);

create index if not exists idx_ticket_types_event on public.ticket_types(event_id);
create index if not exists idx_tickets_event_attendee on public.tickets(event_id, attendee_id);
create index if not exists idx_tickets_token on public.tickets(ticket_token);

alter table public.ticket_types enable row level security;
alter table public.tickets enable row level security;

drop policy if exists "ticket_types_select_members_or_organizer" on public.ticket_types;
create policy "ticket_types_select_members_or_organizer" on public.ticket_types
  for select using (public.is_event_member(event_id) or public.is_event_organizer(event_id));

drop policy if exists "ticket_types_write_organizer" on public.ticket_types;
create policy "ticket_types_write_organizer" on public.ticket_types
  for all using (public.is_event_organizer(event_id)) with check (public.is_event_organizer(event_id));

drop policy if exists "tickets_select_scoped" on public.tickets;
create policy "tickets_select_scoped" on public.tickets
  for select using (
    attendee_id = auth.uid()
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );

drop policy if exists "tickets_insert_attendee" on public.tickets;
create policy "tickets_insert_attendee" on public.tickets
  for insert with check (
    attendee_id = auth.uid()
    and public.is_event_member(event_id, 'attendee')
  );

drop policy if exists "tickets_update_staff_or_organizer" on public.tickets;
create policy "tickets_update_staff_or_organizer" on public.tickets
  for update using (
    public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  ) with check (
    public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );

create or replace function public.issue_ticket(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_attendee_id uuid default auth.uid()
)
returns jsonb
as $$
declare
  v_ticket_type public.ticket_types%rowtype;
  v_ticket public.tickets%rowtype;
begin
  select *
  into v_ticket_type
  from public.ticket_types
  where id = p_ticket_type_id
    and event_id = p_event_id
    and active = true
  for update;

  if not found then
    raise exception 'Ticket type not found';
  end if;

  if v_ticket_type.quantity_sold >= v_ticket_type.quantity_total then
    raise exception 'Ticket type sold out';
  end if;

  if v_ticket_type.sales_start is not null and now() < v_ticket_type.sales_start then
    raise exception 'Ticket sales have not started';
  end if;

  if v_ticket_type.sales_end is not null and now() > v_ticket_type.sales_end then
    raise exception 'Ticket sales have ended';
  end if;

  insert into public.tickets (event_id, ticket_type_id, attendee_id)
  values (p_event_id, p_ticket_type_id, p_attendee_id)
  returning * into v_ticket;

  update public.ticket_types
  set quantity_sold = quantity_sold + 1
  where id = p_ticket_type_id;

  return jsonb_build_object(
    'ok', true,
    'ticket_id', v_ticket.id,
    'ticket_token', v_ticket.ticket_token
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.check_in_ticket(
  p_ticket_token text,
  p_event_id uuid
)
returns jsonb
as $$
declare
  v_ticket public.tickets%rowtype;
  v_ticket_type public.ticket_types%rowtype;
begin
  select *
  into v_ticket
  from public.tickets
  where ticket_token = p_ticket_token
    and event_id = p_event_id
  for update;

  if not found then
    raise exception 'Ticket not found';
  end if;

  select *
  into v_ticket_type
  from public.ticket_types
  where id = v_ticket.ticket_type_id;

  if v_ticket.status = 'checked_in' then
    return jsonb_build_object(
      'ok', true,
      'already_checked_in', true,
      'status', v_ticket.status,
      'ticket_type', v_ticket_type.name,
      'checked_in_at', v_ticket.checked_in_at
    );
  end if;

  if v_ticket.status <> 'active' then
    raise exception 'Ticket is not active';
  end if;

  update public.tickets
  set status = 'checked_in',
      checked_in_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  return jsonb_build_object(
    'ok', true,
    'status', v_ticket.status,
    'ticket_type', v_ticket_type.name,
    'checked_in_at', v_ticket.checked_in_at
  );
end;
$$ language plpgsql security definer set search_path = public;

insert into public.ticket_types (event_id, name, description, price_cents, quantity_total, active)
select e.id, 'General Admission', 'Rooftop entry with wallet access.', 6500, 200, true
from public.events e
where e.event_code = 'NEON-2026'
  and not exists (
    select 1 from public.ticket_types tt where tt.event_id = e.id and tt.name = 'General Admission'
  );

insert into public.ticket_types (event_id, name, description, price_cents, quantity_total, active)
select e.id, 'VIP', 'Priority entry and VIP wristband.', 14000, 50, true
from public.events e
where e.event_code = 'NEON-2026'
  and not exists (
    select 1 from public.ticket_types tt where tt.event_id = e.id and tt.name = 'VIP'
  );
