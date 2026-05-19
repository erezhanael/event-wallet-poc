create table if not exists public.bartender_shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  bartender_id uuid not null references public.users_profile(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

create index if not exists idx_bartender_shifts_event_started
  on public.bartender_shifts(event_id, started_at desc);

create unique index if not exists idx_bartender_shifts_one_active
  on public.bartender_shifts(event_id, bartender_id)
  where ended_at is null;

alter table public.bartender_shifts enable row level security;

drop policy if exists "shifts_select_staff_or_organizer" on public.bartender_shifts;
create policy "shifts_select_staff_or_organizer" on public.bartender_shifts
  for select using (
    bartender_id = auth.uid()
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );

drop policy if exists "shifts_insert_own_bartender" on public.bartender_shifts;
create policy "shifts_insert_own_bartender" on public.bartender_shifts
  for insert with check (
    bartender_id = auth.uid()
    and public.is_event_member(event_id, 'bartender')
  );

drop policy if exists "shifts_update_own_bartender_or_organizer" on public.bartender_shifts;
create policy "shifts_update_own_bartender_or_organizer" on public.bartender_shifts
  for update using (
    bartender_id = auth.uid()
    or public.is_event_organizer(event_id)
  ) with check (
    bartender_id = auth.uid()
    or public.is_event_organizer(event_id)
  );
