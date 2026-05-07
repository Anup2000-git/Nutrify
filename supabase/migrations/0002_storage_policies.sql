-- =====================================================
-- Storage RLS — food-photos bucket
-- =====================================================
-- Run AFTER creating the `food-photos` bucket in Storage UI.
-- Each user can only access photos under their own folder: {user_id}/...
-- =====================================================

-- Allow authenticated users to upload to their own folder
create policy "Users upload own food photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own photos
create policy "Users read own food photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own photos
create policy "Users delete own food photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
