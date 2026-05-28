create table if not exists public.pos_stations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  station_type text not null default 'bar' check (station_type in ('bar', 'food', 'merch', 'other')),
  pairing_code text not null,
  monitor_slug text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pos_stations_event_monitor_slug
  on public.pos_stations(event_id, monitor_slug);

create unique index if not exists idx_pos_stations_event_pairing_code
  on public.pos_stations(event_id, pairing_code);

create index if not exists idx_pos_stations_event_active
  on public.pos_stations(event_id, active);

create table if not exists public.station_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  station_id uuid not null references public.pos_stations(id) on delete cascade,
  staff_user_id uuid not null references public.users_profile(id) on delete cascade,
  monitor_device_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_station_sessions_one_active_staff
  on public.station_sessions(event_id, staff_user_id)
  where ended_at is null;

create unique index if not exists idx_station_sessions_one_active_station
  on public.station_sessions(station_id)
  where ended_at is null;

create index if not exists idx_station_sessions_event_started
  on public.station_sessions(event_id, started_at desc);

alter table public.transactions
  add column if not exists station_id uuid references public.pos_stations(id) on delete set null,
  add column if not exists station_session_id uuid references public.station_sessions(id) on delete set null;

create index if not exists idx_transactions_station
  on public.transactions(event_id, station_id, created_at desc);

alter table public.pos_stations enable row level security;
alter table public.station_sessions enable row level security;

drop policy if exists "pos_stations_select_members_or_organizer" on public.pos_stations;
create policy "pos_stations_select_members_or_organizer" on public.pos_stations
  for select using (
    public.is_event_organizer(event_id)
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_member(event_id, 'checkin')
  );

drop policy if exists "pos_stations_write_organizer" on public.pos_stations;
create policy "pos_stations_write_organizer" on public.pos_stations
  for all using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

drop policy if exists "station_sessions_select_staff_or_organizer" on public.station_sessions;
create policy "station_sessions_select_staff_or_organizer" on public.station_sessions
  for select using (
    staff_user_id = auth.uid()
    or public.is_event_organizer(event_id)
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_member(event_id, 'checkin')
  );

drop policy if exists "station_sessions_insert_own_staff" on public.station_sessions;
create policy "station_sessions_insert_own_staff" on public.station_sessions
  for insert with check (
    staff_user_id = auth.uid()
    and (
      public.is_event_member(event_id, 'bartender')
      or public.is_event_member(event_id, 'checkin')
      or public.is_event_organizer(event_id)
    )
  );

drop policy if exists "station_sessions_update_own_or_organizer" on public.station_sessions;
create policy "station_sessions_update_own_or_organizer" on public.station_sessions
  for update using (
    staff_user_id = auth.uid()
    or public.is_event_organizer(event_id)
  )
  with check (
    staff_user_id = auth.uid()
    or public.is_event_organizer(event_id)
  );

grant select, insert, update on public.pos_stations to authenticated;
grant select, insert, update on public.station_sessions to authenticated;
