drop function if exists public.get_event_dashboard(uuid);
drop function if exists public.confirm_wallet_topup(uuid, uuid, text, integer);
drop function if exists public.deduct_wallet_purchase(uuid, text, jsonb, uuid);
drop function if exists public.is_event_organizer(uuid);
drop function if exists public.is_event_member(uuid, text);

drop table if exists public.stripe_payments cascade;
drop table if exists public.purchase_items cascade;
drop table if exists public.transactions cascade;
drop table if exists public.menu_items cascade;
drop table if exists public.wallets cascade;
drop table if exists public.event_members cascade;
drop table if exists public.events cascade;
drop table if exists public.users_profile cascade;
