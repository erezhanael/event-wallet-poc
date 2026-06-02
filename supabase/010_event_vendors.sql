alter table public.users_profile
  drop constraint if exists users_profile_role_check;

alter table public.users_profile
  add constraint users_profile_role_check
  check (role in ('attendee', 'bartender', 'organizer', 'checkin', 'vendor'));

alter table public.event_members
  drop constraint if exists event_members_role_check;

alter table public.event_members
  add constraint event_members_role_check
  check (role in ('attendee', 'bartender', 'organizer', 'checkin', 'vendor'));

alter table public.menu_items
  add column if not exists vendor_id uuid references public.users_profile(id) on delete set null;

alter table public.pos_stations
  add column if not exists vendor_id uuid references public.users_profile(id) on delete set null;

create index if not exists idx_menu_items_vendor_event
  on public.menu_items(event_id, vendor_id, active);

create index if not exists idx_pos_stations_vendor_event
  on public.pos_stations(event_id, vendor_id, active);

create unique index if not exists idx_pos_stations_one_per_vendor
  on public.pos_stations(event_id, vendor_id)
  where vendor_id is not null;

drop policy if exists "wallets_select_own_staff_or_organizer" on public.wallets;
create policy "wallets_select_own_staff_or_organizer" on public.wallets
  for select using (
    user_id = auth.uid()
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_member(event_id, 'vendor')
    or public.is_event_organizer(event_id)
  );

drop policy if exists "menu_select_members" on public.menu_items;
create policy "menu_select_members" on public.menu_items
  for select using (public.is_event_member(event_id) or public.is_event_organizer(event_id));

drop policy if exists "menu_write_organizer" on public.menu_items;
create policy "menu_write_organizer" on public.menu_items
  for all using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

drop policy if exists "menu_write_vendor_own_items" on public.menu_items;
create policy "menu_write_vendor_own_items" on public.menu_items
  for all using (
    vendor_id = auth.uid()
    and public.is_event_member(event_id, 'vendor')
  )
  with check (
    vendor_id = auth.uid()
    and public.is_event_member(event_id, 'vendor')
  );

drop policy if exists "transactions_select_scoped" on public.transactions;
create policy "transactions_select_scoped" on public.transactions
  for select using (
    exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid())
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_member(event_id, 'vendor')
    or public.is_event_organizer(event_id)
  );

drop policy if exists "transactions_insert_staff_purchase" on public.transactions;
create policy "transactions_insert_staff_purchase" on public.transactions
  for insert with check (
    type = 'purchase'
    and bartender_id = auth.uid()
    and (
      public.is_event_member(event_id, 'bartender')
      or public.is_event_member(event_id, 'vendor')
    )
  );

drop policy if exists "purchase_items_select_visible_transaction" on public.purchase_items;
create policy "purchase_items_select_visible_transaction" on public.purchase_items
  for select using (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_id
        and (
          exists (select 1 from public.wallets w where w.id = t.wallet_id and w.user_id = auth.uid())
          or public.is_event_member(t.event_id, 'bartender')
          or public.is_event_member(t.event_id, 'vendor')
          or public.is_event_organizer(t.event_id)
        )
    )
  );

drop policy if exists "purchase_items_insert_staff_purchase" on public.purchase_items;
create policy "purchase_items_insert_staff_purchase" on public.purchase_items
  for insert with check (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_id
        and t.type = 'purchase'
        and t.bartender_id = auth.uid()
        and (
          public.is_event_member(t.event_id, 'bartender')
          or public.is_event_member(t.event_id, 'vendor')
        )
    )
  );

drop policy if exists "pos_stations_select_members_or_organizer" on public.pos_stations;
create policy "pos_stations_select_members_or_organizer" on public.pos_stations
  for select using (
    public.is_event_organizer(event_id)
    or public.is_event_member(event_id, 'bartender')
    or public.is_event_member(event_id, 'checkin')
    or public.is_event_member(event_id, 'vendor')
  );

drop policy if exists "station_sessions_insert_own_staff" on public.station_sessions;
create policy "station_sessions_insert_own_staff" on public.station_sessions
  for insert with check (
    staff_user_id = auth.uid()
    and (
      public.is_event_member(event_id, 'bartender')
      or public.is_event_member(event_id, 'vendor')
      or public.is_event_member(event_id, 'checkin')
      or public.is_event_organizer(event_id)
    )
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
  values (p_event_id, v_wallet.id, p_bartender_id, 'purchase', -v_total, jsonb_build_object('source', 'pos_checkout'))
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
