-- Create storage buckets for GMB media and YouTube videos
-- Run this in Supabase SQL Editor

-- GMB Media bucket
insert into storage.buckets (id, name, public)
values ('gmb-media', 'gmb-media', true)
on conflict (id) do nothing;

-- YouTube Videos bucket (for future use)
insert into storage.buckets (id, name, public)
values ('youtube-videos', 'youtube-videos', true)
on conflict (id) do nothing;

-- Storage policies for gmb-media
do $$ begin
  create policy "Users can upload their own GMB media"
    on storage.objects for insert
    with check (bucket_id = 'gmb-media' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "Users can view their own GMB media"
    on storage.objects for select
    using (bucket_id = 'gmb-media' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "Users can delete their own GMB media"
    on storage.objects for delete
    using (bucket_id = 'gmb-media' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

-- Storage policies for youtube-videos
do $$ begin
  create policy "Users can upload their own YouTube videos"
    on storage.objects for insert
    with check (bucket_id = 'youtube-videos' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "Users can view their own YouTube videos"
    on storage.objects for select
    using (bucket_id = 'youtube-videos' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "Users can delete their own YouTube videos"
    on storage.objects for delete
    using (bucket_id = 'youtube-videos' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

