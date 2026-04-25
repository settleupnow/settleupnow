-- Run this in your Supabase SQL editor to add subscription tracking columns
alter table business_profile
  add column if not exists subscription_status text default 'free',
  add column if not exists subscription_plan text,
  add column if not exists subscription_reference text,
  add column if not exists subscription_started_at timestamptz;
