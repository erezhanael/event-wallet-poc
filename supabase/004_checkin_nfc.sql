alter table public.users_profile drop constraint if exists users_profile_role_check;
alter table public.users_profile
  add constraint users_profile_role_check check (role in ('attendee', 'bartender', 'checkin', 'organizer'));

alter table public.event_members drop constraint if exists event_members_role_check;
alter table public.event_members
  add constraint event_members_role_check check (role in ('attendee', 'bartender', 'checkin', 'organizer'));

create table if not exists public.attendee_checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_id uuid not null references public.users_profile(id) on delete cascade,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by uuid references public.users_profile(id) on delete set null,
  nfc_tag_uid text,
  nfc_wallet_id uuid references public.wallets(id) on delete set null,
  nfc_assigned_at timestamptz,
  nfc_assigned_by uuid references public.users_profile(id) on delete set null,
  nfc_status text check (nfc_status in ('active', 'replaced', 'lost', 'blocked')),
  replaced_from_tag_uid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, attendee_id)
);

create unique index if not exists idx_attendee_checkins_active_tag
  on public.attendee_checkins(event_id, nfc_tag_uid)
  where nfc_tag_uid is not null and nfc_status = 'active';

create table if not exists public.nfc_assignment_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_id uuid not null references public.users_profile(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  tag_uid text not null,
  action text not null check (action in ('assigned', 'replaced', 'blocked', 'lost')),
  staff_user_id uuid not null references public.users_profile(id) on delete cascade,
  timestamp timestamptz not null default now(),
  device_id text,
  sync_status text not null default 'synced' check (sync_status in ('synced', 'pending', 'conflict'))
);

create index if not exists idx_nfc_assignment_logs_event_tag on public.nfc_assignment_logs(event_id, tag_uid, timestamp desc);

alter table public.attendee_checkins enable row level security;
alter table public.nfc_assignment_logs enable row level security;

drop policy if exists "attendee_checkins_select_staff_or_self" on public.attendee_checkins;
create policy "attendee_checkins_select_staff_or_self" on public.attendee_checkins
  for select using (
    attendee_id = auth.uid()
    or public.is_event_member(event_id, 'checkin')
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );

drop policy if exists "attendee_checkins_write_checkin_or_organizer" on public.attendee_checkins;
create policy "attendee_checkins_write_checkin_or_organizer" on public.attendee_checkins
  for all using (
    public.is_event_member(event_id, 'checkin')
    or public.is_event_organizer(event_id)
  ) with check (
    public.is_event_member(event_id, 'checkin')
    or public.is_event_organizer(event_id)
  );

drop policy if exists "nfc_logs_select_staff_or_organizer" on public.nfc_assignment_logs;
create policy "nfc_logs_select_staff_or_organizer" on public.nfc_assignment_logs
  for select using (
    public.is_event_member(event_id, 'checkin')
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );

drop policy if exists "nfc_logs_insert_checkin_or_organizer" on public.nfc_assignment_logs;
create policy "nfc_logs_insert_checkin_or_organizer" on public.nfc_assignment_logs
  for insert with check (
    public.is_event_member(event_id, 'checkin')
    or public.is_event_organizer(event_id)
  );

create or replace function public.assign_nfc_wristband(
  p_event_id uuid,
  p_ticket_token text,
  p_tag_uid text,
  p_device_id text,
  p_staff_user_id uuid default auth.uid(),
  p_replace boolean default false
)
returns jsonb
as $$
declare
  v_ticket public.tickets%rowtype;
  v_wallet public.wallets%rowtype;
  v_existing public.attendee_checkins%rowtype;
  v_previous_tag text;
begin
  select *
  into v_ticket
  from public.tickets
  where event_id = p_event_id and ticket_token = p_ticket_token
  for update;

  if not found then
    raise exception 'Ticket not found';
  end if;

  select *
  into v_wallet
  from public.wallets
  where event_id = p_event_id and user_id = v_ticket.attendee_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  select *
  into v_existing
  from public.attendee_checkins
  where event_id = p_event_id and nfc_tag_uid = p_tag_uid and nfc_status = 'active'
  for update;

  if found and v_existing.attendee_id <> v_ticket.attendee_id then
    raise exception 'This wristband is already assigned';
  end if;

  select *
  into v_existing
  from public.attendee_checkins
  where event_id = p_event_id and attendee_id = v_ticket.attendee_id
  for update;

  if found and v_existing.nfc_tag_uid is not null and v_existing.nfc_tag_uid <> p_tag_uid and not p_replace then
    raise exception 'Attendee already has an active wristband';
  end if;

  v_previous_tag := case when found then v_existing.nfc_tag_uid else null end;

  insert into public.attendee_checkins (
    event_id,
    attendee_id,
    checked_in,
    checked_in_at,
    checked_in_by,
    nfc_tag_uid,
    nfc_wallet_id,
    nfc_assigned_at,
    nfc_assigned_by,
    nfc_status,
    replaced_from_tag_uid
  )
  values (
    p_event_id,
    v_ticket.attendee_id,
    true,
    now(),
    p_staff_user_id,
    p_tag_uid,
    v_wallet.id,
    now(),
    p_staff_user_id,
    'active',
    case when p_replace then v_previous_tag else null end
  )
  on conflict (event_id, attendee_id)
  do update set
    checked_in = true,
    checked_in_at = now(),
    checked_in_by = p_staff_user_id,
    nfc_tag_uid = p_tag_uid,
    nfc_wallet_id = v_wallet.id,
    nfc_assigned_at = now(),
    nfc_assigned_by = p_staff_user_id,
    nfc_status = 'active',
    replaced_from_tag_uid = case when p_replace then attendee_checkins.nfc_tag_uid else attendee_checkins.replaced_from_tag_uid end,
    updated_at = now();

  update public.tickets
  set status = 'checked_in', checked_in_at = coalesce(checked_in_at, now())
  where id = v_ticket.id;

  update public.wallets
  set status = 'active'
  where id = v_wallet.id;

  insert into public.nfc_assignment_logs (event_id, attendee_id, wallet_id, tag_uid, action, staff_user_id, device_id, sync_status)
  values (p_event_id, v_ticket.attendee_id, v_wallet.id, p_tag_uid, case when p_replace then 'replaced' else 'assigned' end, p_staff_user_id, p_device_id, 'synced');

  return jsonb_build_object(
    'ok', true,
    'message', 'Wristband assigned successfully',
    'wallet_id', v_wallet.id,
    'attendee_id', v_ticket.attendee_id,
    'tag_uid', p_tag_uid
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.block_nfc_wristband(
  p_event_id uuid,
  p_tag_uid text,
  p_action text,
  p_device_id text,
  p_staff_user_id uuid default auth.uid()
)
returns jsonb
as $$
declare
  v_status public.attendee_checkins%rowtype;
begin
  if p_action not in ('lost', 'blocked') then
    raise exception 'Invalid NFC status';
  end if;

  select *
  into v_status
  from public.attendee_checkins
  where event_id = p_event_id and nfc_tag_uid = p_tag_uid
  for update;

  if not found then
    raise exception 'NFC wristband not found';
  end if;

  update public.attendee_checkins
  set nfc_status = p_action,
      updated_at = now()
  where id = v_status.id;

  insert into public.nfc_assignment_logs (event_id, attendee_id, wallet_id, tag_uid, action, staff_user_id, device_id, sync_status)
  values (p_event_id, v_status.attendee_id, v_status.nfc_wallet_id, p_tag_uid, p_action, p_staff_user_id, p_device_id, 'synced');

  return jsonb_build_object('ok', true, 'status', p_action);
end;
$$ language plpgsql security definer set search_path = public;
