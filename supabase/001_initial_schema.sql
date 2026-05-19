create extension if not exists pgcrypto;

create table public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('attendee', 'bartender', 'organizer')),
  full_name text not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users_profile(id) on delete cascade,
  name text not null,
  event_code text not null unique,
  start_time timestamptz not null,
  end_time timestamptz not null,
  currency text not null default 'ILS',
  created_at timestamptz not null default now()
);

create table public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role text not null check (role in ('attendee', 'bartender', 'organizer')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  qr_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents > 0),
  category text not null,
  active boolean not null default true
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  bartender_id uuid references public.users_profile(id) on delete set null,
  type text not null check (type in ('topup', 'purchase', 'refund', 'adjustment')),
  amount_cents integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  quantity integer not null check (quantity > 0),
  price_cents integer not null check (price_cents > 0)
);

create table public.stripe_payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  stripe_session_id text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create table public.bartender_shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  bartender_id uuid not null references public.users_profile(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

create index idx_event_members_user on public.event_members(user_id);
create index idx_wallets_qr_token on public.wallets(qr_token);
create index idx_transactions_event_created on public.transactions(event_id, created_at desc);
create index idx_purchase_items_transaction on public.purchase_items(transaction_id);
create index idx_bartender_shifts_event_started on public.bartender_shifts(event_id, started_at desc);
create unique index idx_bartender_shifts_one_active
  on public.bartender_shifts(event_id, bartender_id)
  where ended_at is null;

create or replace function public.is_event_member(p_event_id uuid, p_role text default null)
returns boolean
as $$
  select exists (
    select 1
    from public.event_members em
    where em.event_id = p_event_id
      and em.user_id = auth.uid()
      and (p_role is null or em.role = p_role)
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_event_organizer(p_event_id uuid)
returns boolean
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

alter table public.users_profile enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.wallets enable row level security;
alter table public.menu_items enable row level security;
alter table public.transactions enable row level security;
alter table public.purchase_items enable row level security;
alter table public.stripe_payments enable row level security;
alter table public.bartender_shifts enable row level security;

create policy "profiles_select_own" on public.users_profile
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.users_profile
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "events_select_members_or_organizer" on public.events
  for select using (organizer_id = auth.uid() or public.is_event_member(id));
create policy "events_insert_organizer" on public.events
  for insert with check (organizer_id = auth.uid());
create policy "events_update_organizer" on public.events
  for update using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());

create policy "event_members_select_self_or_organizer" on public.event_members
  for select using (user_id = auth.uid() or public.is_event_organizer(event_id));
create policy "event_members_insert_organizer" on public.event_members
  for insert with check (public.is_event_organizer(event_id));
create policy "event_members_update_organizer" on public.event_members
  for update using (public.is_event_organizer(event_id)) with check (public.is_event_organizer(event_id));

create policy "wallets_select_own_staff_or_organizer" on public.wallets
  for select using (
    user_id = auth.uid()
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );
create policy "wallets_insert_own" on public.wallets
  for insert with check (user_id = auth.uid());
create policy "wallets_update_organizer_only" on public.wallets
  for update using (public.is_event_organizer(event_id)) with check (public.is_event_organizer(event_id));

create policy "menu_select_members" on public.menu_items
  for select using (public.is_event_member(event_id) or public.is_event_organizer(event_id));
create policy "menu_write_organizer" on public.menu_items
  for all using (public.is_event_organizer(event_id)) with check (public.is_event_organizer(event_id));

create policy "transactions_select_scoped" on public.transactions
  for select using (
    exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid())
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );
create policy "transactions_insert_bartender_purchase" on public.transactions
  for insert with check (
    type = 'purchase'
    and bartender_id = auth.uid()
    and public.is_event_member(event_id, 'bartender')
  );

create policy "purchase_items_select_visible_transaction" on public.purchase_items
  for select using (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_id
        and (
          exists (select 1 from public.wallets w where w.id = t.wallet_id and w.user_id = auth.uid())
          or public.is_event_member(t.event_id, 'bartender')
          or public.is_event_organizer(t.event_id)
        )
    )
  );
create policy "purchase_items_insert_bartender_purchase" on public.purchase_items
  for insert with check (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_id
        and t.type = 'purchase'
        and t.bartender_id = auth.uid()
        and public.is_event_member(t.event_id, 'bartender')
    )
  );

create policy "stripe_payments_select_owner_or_organizer" on public.stripe_payments
  for select using (
    exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid())
    or public.is_event_organizer(event_id)
  );

create policy "shifts_select_staff_or_organizer" on public.bartender_shifts
  for select using (
    bartender_id = auth.uid()
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_organizer(event_id)
  );
create policy "shifts_insert_own_bartender" on public.bartender_shifts
  for insert with check (
    bartender_id = auth.uid()
    and public.is_event_member(event_id, 'bartender')
  );
create policy "shifts_update_own_bartender_or_organizer" on public.bartender_shifts
  for update using (
    bartender_id = auth.uid()
    or public.is_event_organizer(event_id)
  ) with check (
    bartender_id = auth.uid()
    or public.is_event_organizer(event_id)
  );

create or replace function public.deduct_wallet_purchase(
  p_event_id uuid,
  p_qr_token text,
  p_items jsonb,
  p_bartender_id uuid default auth.uid()
)
returns jsonb
as $$
declare
  v_wallet wallets%rowtype;
  v_item jsonb;
  v_menu menu_items%rowtype;
  v_quantity integer;
  v_total integer := 0;
  v_transaction_id uuid;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  select *
  into v_wallet
  from public.wallets
  where event_id = p_event_id and qr_token = p_qr_token and status = 'active'
  for update;

  if not found then
    raise exception 'Active wallet not found';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest((v_item->>'quantity')::integer, 0);
    if v_quantity <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select *
    into v_menu
    from public.menu_items
    where id = (v_item->>'menuItemId')::uuid
      and event_id = p_event_id
      and active = true;

    if not found then
      raise exception 'Menu item not found';
    end if;

    v_total := v_total + (v_menu.price_cents * v_quantity);
  end loop;

  if v_wallet.balance_cents < v_total then
    raise exception 'Insufficient balance';
  end if;

  update public.wallets
  set balance_cents = balance_cents - v_total
  where id = v_wallet.id;

  insert into public.transactions (event_id, wallet_id, bartender_id, type, amount_cents, metadata)
  values (p_event_id, v_wallet.id, p_bartender_id, 'purchase', -v_total, jsonb_build_object('source', 'bar_checkout'))
  returning id into v_transaction_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select *
    into v_menu
    from public.menu_items
    where id = (v_item->>'menuItemId')::uuid;

    insert into public.purchase_items (transaction_id, menu_item_id, quantity, price_cents)
    values (v_transaction_id, v_menu.id, (v_item->>'quantity')::integer, v_menu.price_cents);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'transaction_id', v_transaction_id,
    'balance_cents', v_wallet.balance_cents - v_total
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.confirm_wallet_topup(
  p_event_id uuid,
  p_wallet_id uuid,
  p_stripe_session_id text,
  p_amount_cents integer
)
returns jsonb
as $$
declare
  v_payment stripe_payments%rowtype;
  v_transaction_id uuid;
  v_new_balance integer;
begin
  select *
  into v_payment
  from public.stripe_payments
  where stripe_session_id = p_stripe_session_id
  for update;

  if found and v_payment.status = 'completed' then
    select balance_cents into v_new_balance from public.wallets where id = p_wallet_id;
    return jsonb_build_object('ok', true, 'already_confirmed', true, 'balance_cents', v_new_balance);
  end if;

  insert into public.stripe_payments (event_id, wallet_id, stripe_session_id, amount_cents, status)
  values (p_event_id, p_wallet_id, p_stripe_session_id, p_amount_cents, 'completed')
  on conflict (stripe_session_id)
  do update set status = 'completed'
  returning * into v_payment;

  update public.wallets
  set balance_cents = balance_cents + p_amount_cents
  where id = p_wallet_id and event_id = p_event_id
  returning balance_cents into v_new_balance;

  if not found then
    raise exception 'Wallet not found for top-up';
  end if;

  insert into public.transactions (event_id, wallet_id, bartender_id, type, amount_cents, metadata)
  values (
    p_event_id,
    p_wallet_id,
    null,
    'topup',
    p_amount_cents,
    jsonb_build_object('stripe_session_id', p_stripe_session_id)
  )
  returning id into v_transaction_id;

  return jsonb_build_object('ok', true, 'transaction_id', v_transaction_id, 'balance_cents', v_new_balance);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.get_event_dashboard(p_event_id uuid)
returns jsonb
as $$
  with tx as (
    select *
    from public.transactions
    where event_id = p_event_id
  ),
  item_sales as (
    select mi.name, sum(pi.quantity)::integer as quantity, sum(pi.quantity * pi.price_cents)::integer as revenue_cents
    from public.purchase_items pi
    join public.transactions t on t.id = pi.transaction_id
    join public.menu_items mi on mi.id = pi.menu_item_id
    where t.event_id = p_event_id and t.type = 'purchase'
    group by mi.name
    order by revenue_cents desc
    limit 5
  ),
  hourly as (
    select to_char(date_trunc('hour', created_at), 'HH24:00') as hour, abs(sum(amount_cents))::integer as sales_cents
    from tx
    where type = 'purchase'
    group by 1
    order by 1
  )
  select jsonb_build_object(
    'totalPrepaidCents', coalesce((select sum(amount_cents) from tx where type = 'topup'), 0),
    'totalSpentCents', coalesce((select abs(sum(amount_cents)) from tx where type = 'purchase'), 0),
    'outstandingCents', coalesce((select sum(balance_cents) from public.wallets where event_id = p_event_id), 0),
    'transactionCount', coalesce((select count(*) from tx), 0),
    'attendeeCount', coalesce((select count(*) from public.event_members where event_id = p_event_id and role = 'attendee'), 0),
    'topItems', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'revenueCents', revenue_cents)) from item_sales), '[]'::jsonb),
    'hourlySales', coalesce((select jsonb_agg(jsonb_build_object('hour', hour, 'salesCents', sales_cents)) from hourly), '[]'::jsonb)
  );
$$ language sql stable security definer set search_path = public;
