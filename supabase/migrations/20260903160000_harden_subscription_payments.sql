-- Adapted from settleup-phase1-security.patch (20260903160000).
-- Adaptations for the current schema:
--   1. subscription_status keeps 'past_due' (base schema + paystack-webhook use it;
--      the patch dropped it, which would break the failed-payment flow).
--   2. The RPC also sets subscription_expires_at (+30 days), preserving the
--      Pass 1 renewal window the patch version omitted.
--   3. All statements are idempotent (IF NOT EXISTS / guarded) so this repairs
--      fresh environments and applies cleanly on top of the base migration.
--   4. subscription_payments is the activation ledger (unique reference = no
--      reuse). payment_events (base schema) remains the webhook event log.

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  plan text not null check (plan in ('basic', 'pro')),
  amount bigint not null check (amount > 0),
  currency text not null,
  provider_paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscription_payments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscription_payments'
      and policyname = 'Users can read their own subscription payments'
  ) then
    create policy "Users can read their own subscription payments"
    on public.subscription_payments for select
    to authenticated
    using (user_id = auth.uid());
  end if;
end $$;

create index if not exists subscription_payments_user_id_idx
on public.subscription_payments (user_id, created_at desc);

create unique index if not exists business_profile_user_id_key
on public.business_profile (user_id);

alter table public.business_profile
  add column if not exists subscription_status text default 'free',
  add column if not exists subscription_plan text,
  add column if not exists subscription_reference text,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_expires_at timestamptz;

-- Status set keeps 'past_due' for the webhook failed-payment flow.
alter table public.business_profile
  drop constraint if exists business_profile_subscription_status_check,
  add constraint business_profile_subscription_status_check
    check (subscription_status in ('free', 'active', 'past_due', 'cancelled')),
  drop constraint if exists business_profile_subscription_plan_check,
  add constraint business_profile_subscription_plan_check
    check (subscription_plan is null or subscription_plan in ('basic', 'pro'));

-- Atomic activation: payment insert + profile upsert in one transaction.
-- Unique(reference) makes double-spend fail with 23505, which verify-payment
-- maps to HTTP 409. SECURITY DEFINER + strict grants: service_role only.
create or replace function public.activate_subscription_from_payment(
  payment_reference text,
  payment_user_id uuid,
  payment_plan text,
  payment_amount bigint,
  payment_currency text,
  payment_provider text,
  payment_paid_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscription_payments (
    reference, user_id, plan, amount, currency, provider, provider_paid_at
  ) values (
    payment_reference, payment_user_id, payment_plan, payment_amount,
    payment_currency, payment_provider, payment_paid_at
  );

  insert into public.business_profile (
    user_id, business_name, bank_name, bank_account_number, bank_account_name,
    subscription_status, subscription_plan, subscription_reference,
    subscription_started_at, subscription_expires_at
  ) values (
    payment_user_id, '', '', '', '', 'active', payment_plan,
    payment_reference, now(), now() + interval '30 days'
  )
  on conflict (user_id) do update set
    subscription_status = excluded.subscription_status,
    subscription_plan = excluded.subscription_plan,
    subscription_reference = excluded.subscription_reference,
    subscription_started_at = excluded.subscription_started_at,
    subscription_expires_at = excluded.subscription_expires_at;
end;
$$;

revoke all on function public.activate_subscription_from_payment(text, uuid, text, bigint, text, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.activate_subscription_from_payment(text, uuid, text, bigint, text, text, timestamptz)
to service_role;
