-- Pass 1 — Reconstructed base schema (source of truth).
-- Production already has these tables; every statement is idempotent so this
-- migration documents the expected shape AND repairs fresh environments.
-- Run order: this file sorts first (2020 prefix) by design.

-- ============ extensions ============
create extension if not exists "pgcrypto";

-- ============ business_profile ============
create table if not exists public.business_profile (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  business_name text not null default '',
  logo_url text,
  bank_name text not null default '',
  bank_account_number text not null default '',
  bank_account_name text not null default '',
  reminder_template text,
  tin text,
  vat_number text,
  vat_rate numeric default 7.5,
  include_vat_default boolean default false,
  subscription_status text not null default 'free',
  subscription_plan text,
  subscription_reference text,
  subscription_started_at timestamptz,
  subscription_expires_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint business_profile_plan_check
    check (subscription_plan is null or subscription_plan in ('basic', 'pro')),
  constraint business_profile_status_check
    check (subscription_status in ('free', 'active', 'past_due', 'cancelled'))
);

-- Columns added incrementally in production — backfill for fresh DBs.
alter table public.business_profile add column if not exists reminder_template text;
alter table public.business_profile add column if not exists tin text;
alter table public.business_profile add column if not exists vat_number text;
alter table public.business_profile add column if not exists vat_rate numeric default 7.5;
alter table public.business_profile add column if not exists include_vat_default boolean default false;
alter table public.business_profile add column if not exists subscription_status text default 'free';
alter table public.business_profile add column if not exists subscription_plan text;
alter table public.business_profile add column if not exists subscription_reference text;
alter table public.business_profile add column if not exists subscription_started_at timestamptz;
alter table public.business_profile add column if not exists subscription_expires_at timestamptz;
alter table public.business_profile add column if not exists created_at timestamptz default now();
alter table public.business_profile add column if not exists updated_at timestamptz default now();

-- One reference may only ever activate one account (verify-payment enforces).
create unique index if not exists business_profile_subscription_reference_uidx
  on public.business_profile (subscription_reference)
  where subscription_reference is not null;

alter table public.business_profile enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='business_profile' and policyname='Users manage own business profile') then
    create policy "Users manage own business profile"
    on public.business_profile for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

-- ============ invoices ============
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name text not null,
  client_email text not null default '',
  client_whatsapp text not null default '',
  invoice_amount numeric not null default 0 check (invoice_amount >= 0),
  currency text not null default 'NGN',
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'overdue', 'paid')),
  reminder_count integer not null default 0,
  last_reminder_sent timestamptz,
  paid_at timestamptz,
  notes text not null default '',
  invoice_number text not null default '',
  tax_rate numeric not null default 0,
  payment_link text,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  created_at timestamptz default now() not null
);

alter table public.invoices add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.invoices add column if not exists reminder_count integer default 0;
alter table public.invoices add column if not exists last_reminder_sent timestamptz;
alter table public.invoices add column if not exists invoice_number text default '';

-- Invoice numbers unique per business (prevents client-side race duplicates surfacing silently).
create unique index if not exists invoices_user_number_uidx
  on public.invoices (user_id, invoice_number)
  where invoice_number <> '';
create index if not exists invoices_user_status_idx on public.invoices (user_id, status);
create index if not exists invoices_user_due_idx on public.invoices (user_id, due_date);

alter table public.invoices enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='Users manage own invoices') then
    create policy "Users manage own invoices"
    on public.invoices for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

-- ============ line_items ============
create table if not exists public.line_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  amount numeric not null default 0,
  created_at timestamptz default now() not null
);

create index if not exists line_items_invoice_idx on public.line_items (invoice_id);

alter table public.line_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='line_items' and policyname='Users manage own line items') then
    create policy "Users manage own line items"
    on public.line_items for all
    using (exists (select 1 from public.invoices i where i.id = line_items.invoice_id and i.user_id = auth.uid()))
    with check (exists (select 1 from public.invoices i where i.id = line_items.invoice_id and i.user_id = auth.uid()));
  end if;
end $$;

-- ============ waitlist ============
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamptz default now() not null
);

alter table public.waitlist enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='waitlist' and policyname='Anyone can join waitlist') then
    create policy "Anyone can join waitlist"
    on public.waitlist for insert
    to anon, authenticated
    with check (true);
  end if;
end $$;

-- ============ payment_events ledger (verify-payment + webhook) ============
create table if not exists public.payment_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'paystack',
  event text,
  reference text,
  plan text,
  amount_kobo integer,
  currency text,
  payer_email text,
  raw jsonb,
  created_at timestamptz default now() not null
);

create unique index if not exists payment_events_provider_reference_uidx
  on public.payment_events (provider, reference)
  where reference is not null;
create index if not exists payment_events_user_idx on public.payment_events (user_id);

alter table public.payment_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payment_events' and policyname='Users read own payment events') then
    create policy "Users read own payment events"
    on public.payment_events for select
    using (user_id = auth.uid());
  end if;
end $$;

-- ============ storage hardening ============
-- Logos: isolate to the owner's folder (<uid>/...). Replaces the old
-- bucket-wide "any authenticated user can update/delete any logo" policies.
do $$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can update own logos') then
    drop policy "Users can update own logos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can delete own logos') then
    drop policy "Users can delete own logos" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users can upload logos') then
    drop policy "Users can upload logos" on storage.objects;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users upload own logos') then
    create policy "Users upload own logos"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users update own logos') then
    create policy "Users update own logos"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users delete own logos') then
    create policy "Users delete own logos"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

-- Blog images: uploads/deletes restricted to admins (is_admin in user metadata).
do $$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Authenticated users can upload blog images.') then
    drop policy "Authenticated users can upload blog images." on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Authenticated users can delete blog images.') then
    drop policy "Authenticated users can delete blog images." on storage.objects;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Admins upload blog images') then
    create policy "Admins upload blog images"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'blog-images' and (auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Admins delete blog images') then
    create policy "Admins delete blog images"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'blog-images' and (auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true');
  end if;
end $$;
