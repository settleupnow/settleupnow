-- Adapted from settleup-phase1-security.patch (20260903161000).
-- Adaptations for the current schema:
--   1. Also drops the Pass 1 base-migration policy names
--      ("Users upload/update/delete own logos", "Admins upload/delete blog images")
--      before creating the canonical policies, so this applies cleanly whether
--      or not the base migration ran.
--   2. Admin checks use app_metadata.is_admin (never user_metadata, which the
--      client can edit). This matches the edge-function checks in admin-data
--      and admin-send-email.
--   3. Wrapped in DO blocks guarded on pg_policies for safe re-runs.

-- ---- logos: owner-folder isolation ----
drop policy if exists "Users can upload logos" on storage.objects;
drop policy if exists "Users can update own logos" on storage.objects;
drop policy if exists "Users can delete own logos" on storage.objects;
drop policy if exists "Users upload own logos" on storage.objects;
drop policy if exists "Users update own logos" on storage.objects;
drop policy if exists "Users delete own logos" on storage.objects;
drop policy if exists "Users can upload own logos" on storage.objects;
drop policy if exists "Users can update own logos" on storage.objects;
drop policy if exists "Users can delete own logos" on storage.objects;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can upload own logos'
  ) then
    create policy "Users can upload own logos"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'logos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can update own logos'
  ) then
    create policy "Users can update own logos"
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'logos'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'logos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can delete own logos'
  ) then
    create policy "Users can delete own logos"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'logos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;

-- ---- blog-images: admins only via app_metadata ----
drop policy if exists "Authenticated users can upload blog images." on storage.objects;
drop policy if exists "Authenticated users can delete blog images." on storage.objects;
drop policy if exists "Admins upload blog images" on storage.objects;
drop policy if exists "Admins delete blog images" on storage.objects;
drop policy if exists "Admins can upload blog images" on storage.objects;
drop policy if exists "Admins can delete blog images" on storage.objects;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins can upload blog images'
  ) then
    create policy "Admins can upload blog images"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'blog-images'
      and coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins can delete blog images'
  ) then
    create policy "Admins can delete blog images"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'blog-images'
      and coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
    );
  end if;
end $$;
