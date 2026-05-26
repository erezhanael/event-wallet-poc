create table if not exists public.ticket_promotions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed', 'free')),
  discount_value integer not null default 0 check (discount_value >= 0),
  eligible_emails text[] not null default '{}',
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (redeemed_count <= coalesce(max_redemptions, redeemed_count)),
  check (
    (discount_type = 'free' and discount_value = 0)
    or (discount_type = 'percent' and discount_value between 1 and 100)
    or (discount_type = 'fixed' and discount_value > 0)
  ),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index if not exists idx_ticket_promotions_event_code
  on public.ticket_promotions(event_id, lower(code));

create index if not exists idx_ticket_promotions_event_active
  on public.ticket_promotions(event_id, active);

alter table public.ticket_promotions enable row level security;

drop policy if exists "ticket_promotions_select_organizer" on public.ticket_promotions;
create policy "ticket_promotions_select_organizer" on public.ticket_promotions
  for select using (public.is_event_organizer(event_id));

drop policy if exists "ticket_promotions_write_organizer" on public.ticket_promotions;
create policy "ticket_promotions_write_organizer" on public.ticket_promotions
  for all using (public.is_event_organizer(event_id)) with check (public.is_event_organizer(event_id));

alter table public.tickets
  add column if not exists original_price_cents integer not null default 0 check (original_price_cents >= 0),
  add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0),
  add column if not exists paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  add column if not exists promo_code_id uuid references public.ticket_promotions(id) on delete set null;

update public.tickets t
set original_price_cents = tt.price_cents,
    paid_amount_cents = tt.price_cents
from public.ticket_types tt
where t.ticket_type_id = tt.id
  and t.original_price_cents = 0
  and t.paid_amount_cents = 0;

create table if not exists public.ticket_promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  promotion_id uuid not null references public.ticket_promotions(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  attendee_id uuid not null references public.users_profile(id) on delete cascade,
  attendee_email text,
  discount_cents integer not null default 0 check (discount_cents >= 0),
  created_at timestamptz not null default now(),
  unique (promotion_id, attendee_id)
);

create index if not exists idx_ticket_promotion_redemptions_event
  on public.ticket_promotion_redemptions(event_id, created_at desc);

alter table public.ticket_promotion_redemptions enable row level security;

drop policy if exists "ticket_promotion_redemptions_select_owner_or_organizer" on public.ticket_promotion_redemptions;
create policy "ticket_promotion_redemptions_select_owner_or_organizer" on public.ticket_promotion_redemptions
  for select using (
    attendee_id = auth.uid()
    or public.is_event_organizer(event_id)
  );

grant select, insert, update on public.ticket_promotions to authenticated;
grant select, insert on public.ticket_promotion_redemptions to authenticated;

create or replace function public.issue_ticket_with_promo(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_attendee_id uuid default auth.uid(),
  p_promo_code text default null,
  p_attendee_email text default null
)
returns jsonb
as $$
declare
  v_ticket_type public.ticket_types%rowtype;
  v_ticket public.tickets%rowtype;
  v_promo public.ticket_promotions%rowtype;
  v_has_promo boolean := nullif(trim(coalesce(p_promo_code, '')), '') is not null;
  v_normalized_code text := lower(trim(coalesce(p_promo_code, '')));
  v_email text := lower(trim(coalesce(p_attendee_email, '')));
  v_discount_cents integer := 0;
  v_paid_amount_cents integer := 0;
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

  if v_has_promo then
    select *
    into v_promo
    from public.ticket_promotions
    where event_id = p_event_id
      and lower(code) = v_normalized_code
    for update;

    if not found then
      raise exception 'Coupon not found';
    end if;

    if not v_promo.active then
      raise exception 'Coupon is inactive';
    end if;

    if v_promo.starts_at is not null and now() < v_promo.starts_at then
      raise exception 'Coupon is not active yet';
    end if;

    if v_promo.ends_at is not null and now() > v_promo.ends_at then
      raise exception 'Coupon has expired';
    end if;

    if v_promo.max_redemptions is not null and v_promo.redeemed_count >= v_promo.max_redemptions then
      raise exception 'Coupon is fully redeemed';
    end if;

    if array_length(v_promo.eligible_emails, 1) is not null and not exists (
      select 1
      from unnest(v_promo.eligible_emails) as eligible_email
      where lower(trim(eligible_email)) = v_email
    ) then
      raise exception 'Coupon is not assigned to this email';
    end if;

    if exists (
      select 1
      from public.ticket_promotion_redemptions
      where promotion_id = v_promo.id
        and attendee_id = p_attendee_id
    ) then
      raise exception 'Coupon already used by this attendee';
    end if;

    if v_promo.discount_type = 'free' then
      v_discount_cents := v_ticket_type.price_cents;
    elsif v_promo.discount_type = 'percent' then
      v_discount_cents := least(v_ticket_type.price_cents, round(v_ticket_type.price_cents * v_promo.discount_value / 100.0)::integer);
    else
      v_discount_cents := least(v_ticket_type.price_cents, v_promo.discount_value);
    end if;
  end if;

  v_paid_amount_cents := greatest(0, v_ticket_type.price_cents - v_discount_cents);

  insert into public.tickets (
    event_id,
    ticket_type_id,
    attendee_id,
    original_price_cents,
    discount_cents,
    paid_amount_cents,
    promo_code_id
  )
  values (
    p_event_id,
    p_ticket_type_id,
    p_attendee_id,
    v_ticket_type.price_cents,
    v_discount_cents,
    v_paid_amount_cents,
    case when v_has_promo then v_promo.id else null end
  )
  returning * into v_ticket;

  update public.ticket_types
  set quantity_sold = quantity_sold + 1
  where id = p_ticket_type_id;

  if v_has_promo then
    update public.ticket_promotions
    set redeemed_count = redeemed_count + 1,
        updated_at = now()
    where id = v_promo.id;

    insert into public.ticket_promotion_redemptions (
      event_id,
      promotion_id,
      ticket_id,
      attendee_id,
      attendee_email,
      discount_cents
    )
    values (
      p_event_id,
      v_promo.id,
      v_ticket.id,
      p_attendee_id,
      nullif(v_email, ''),
      v_discount_cents
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'ticket_id', v_ticket.id,
    'ticket_token', v_ticket.ticket_token,
    'original_price_cents', v_ticket_type.price_cents,
    'discount_cents', v_discount_cents,
    'paid_amount_cents', v_paid_amount_cents,
    'promo_code', case when v_has_promo then v_promo.code else null end
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.issue_ticket(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_attendee_id uuid default auth.uid()
)
returns jsonb
as $$
begin
  return public.issue_ticket_with_promo(p_event_id, p_ticket_type_id, p_attendee_id, null, null);
end;
$$ language plpgsql security definer set search_path = public;
