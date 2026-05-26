create or replace function public.checkin_cash_topup(
  p_event_id uuid,
  p_wallet_token text,
  p_cash_amount_cents integer,
  p_bonus_percent integer,
  p_staff_user_id uuid,
  p_device_id text default null
)
returns jsonb
as $$
declare
  v_wallet public.wallets%rowtype;
  v_bonus_cents integer;
  v_total_cents integer;
  v_transaction_id uuid;
begin
  if p_cash_amount_cents <= 0 then
    raise exception 'Cash amount must be positive';
  end if;

  if p_bonus_percent < 0 or p_bonus_percent > 100 then
    raise exception 'Bonus percent must be between 0 and 100';
  end if;

  if not exists (
    select 1
    from public.event_members em
    where em.event_id = p_event_id
      and em.user_id = p_staff_user_id
      and em.role in ('checkin', 'organizer')
  ) then
    raise exception 'Check-in access required';
  end if;

  select *
  into v_wallet
  from public.wallets
  where event_id = p_event_id
    and qr_token = p_wallet_token
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active wallet not found';
  end if;

  v_bonus_cents := round(p_cash_amount_cents * (p_bonus_percent::numeric / 100))::integer;
  v_total_cents := p_cash_amount_cents + v_bonus_cents;

  update public.wallets
  set balance_cents = balance_cents + v_total_cents
  where id = v_wallet.id
  returning * into v_wallet;

  insert into public.transactions (event_id, wallet_id, bartender_id, type, amount_cents, metadata)
  values (
    p_event_id,
    v_wallet.id,
    p_staff_user_id,
    'topup',
    v_total_cents,
    jsonb_build_object(
      'source', 'checkin_cash',
      'staff_user_id', p_staff_user_id,
      'device_id', p_device_id,
      'cash_amount_cents', p_cash_amount_cents,
      'bonus_percent', p_bonus_percent,
      'bonus_cents', v_bonus_cents,
      'total_credit_cents', v_total_cents
    )
  )
  returning id into v_transaction_id;

  return jsonb_build_object(
    'ok', true,
    'transaction_id', v_transaction_id,
    'wallet_id', v_wallet.id,
    'balance_cents', v_wallet.balance_cents,
    'cash_amount_cents', p_cash_amount_cents,
    'bonus_cents', v_bonus_cents,
    'total_credit_cents', v_total_cents
  );
end;
$$ language plpgsql security definer set search_path = public;
