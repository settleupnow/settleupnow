alter table business_profile add column if not exists reminder_template text;

create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  whatsapp text,
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table clients enable row level security;

create policy "Users manage own clients"
on clients for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Users can upload logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'logos');

create policy "Public can view logos"
on storage.objects for select
to public
using (bucket_id = 'logos');

create policy "Users can update own logos"
on storage.objects for update
to authenticated
using (bucket_id = 'logos');

create policy "Users can delete own logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'logos');
