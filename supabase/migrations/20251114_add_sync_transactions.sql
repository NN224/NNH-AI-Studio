-- Create sync_progress table for tracking transactional sync state
create table if not exists public.sync_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.gmb_accounts(id) on delete cascade,
  status varchar(20) not null check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_locations int default 0,
  total_reviews int default 0,
  total_questions int default 0,
  synced_locations int default 0,
  synced_reviews int default 0,
  synced_questions int default 0,
  last_location_id varchar(255),
  last_review_id varchar(255),
  last_question_id varchar(255),
  resume_payload jsonb,
  error_message text,
  error_details jsonb,
  retry_count int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sync_progress_user_status
  on public.sync_progress(user_id, status);

create index if not exists idx_sync_progress_account
  on public.sync_progress(account_id);

create index if not exists idx_sync_progress_created
  on public.sync_progress(created_at desc);

create or replace function public.set_sync_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_progress_updated_at on public.sync_progress;
create trigger trg_sync_progress_updated_at
before update on public.sync_progress
for each row
execute procedure public.set_sync_progress_updated_at();

-- RPC function for transactional sync
create or replace function public.sync_gmb_data_transactional(
  p_account_id uuid,
  p_locations jsonb,
  p_reviews jsonb,
  p_questions jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_locations_synced int := 0;
  v_reviews_synced int := 0;
  v_questions_synced int := 0;
  v_sync_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'auth.uid() is null. Ensure the RPC is called with an authenticated context.';
  end if;

  insert into public.sync_progress (
    id,
    user_id,
    account_id,
    status,
    started_at,
    total_locations,
    total_reviews,
    total_questions
  ) values (
    v_sync_id,
    v_user_id,
    p_account_id,
    'processing',
    now(),
    coalesce(jsonb_array_length(p_locations), 0),
    coalesce(jsonb_array_length(p_reviews), 0),
    coalesce(jsonb_array_length(p_questions), 0)
  );

  with upsert_locations as (
    insert into public.gmb_locations (
      gmb_account_id,
      user_id,
      location_id,
      normalized_location_id,
      location_name,
      address,
      phone,
      website,
      category,
      rating,
      review_count,
      latitude,
      longitude,
      profile_completeness,
      is_active,
      status,
      metadata,
      last_synced_at
    )
    select
      coalesce(nullif(elem->>'gmb_account_id', '')::uuid, p_account_id),
      v_user_id,
      elem->>'location_id',
      elem->>'normalized_location_id',
      elem->>'location_name',
      elem->>'address',
      elem->>'phone',
      elem->>'website',
      elem->>'category',
      nullif(elem->>'rating', '')::numeric,
      nullif(elem->>'review_count', '')::int,
      nullif(elem->>'latitude', '')::numeric,
      nullif(elem->>'longitude', '')::numeric,
      nullif(elem->>'profile_completeness', '')::int,
      coalesce((elem->>'is_active')::boolean, true),
      elem->>'status',
      elem->'metadata',
      now()
    from jsonb_array_elements(coalesce(p_locations, '[]'::jsonb)) elem
    on conflict (location_id) do update set
      location_name = excluded.location_name,
      address = excluded.address,
      phone = excluded.phone,
      website = excluded.website,
      category = excluded.category,
      rating = excluded.rating,
      review_count = excluded.review_count,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      profile_completeness = excluded.profile_completeness,
      status = excluded.status,
      metadata = excluded.metadata,
      is_active = excluded.is_active,
      last_synced_at = now()
    returning 1
  )
  select count(*) into v_locations_synced from upsert_locations;

  with upsert_reviews as (
    insert into public.gmb_reviews (
      user_id,
      location_id,
      gmb_account_id,
      external_review_id,
      rating,
      review_text,
      review_date,
      reviewer_name,
      reviewer_display_name,
      reviewer_profile_photo_url,
      response,
      reply_date,
      responded_at,
      has_reply,
      status,
      google_my_business_name,
      review_url,
      synced_at,
      ai_sentiment
    )
    select
      v_user_id,
      loc.id,
      loc.gmb_account_id,
      elem->>'review_id',
      nullif(elem->>'rating', '')::int,
      elem->>'review_text',
      nullif(elem->>'review_date', '')::timestamptz,
      elem->>'reviewer_name',
      elem->>'reviewer_display_name',
      elem->>'reviewer_photo',
      elem->>'reply_text',
      nullif(elem->>'reply_date', '')::timestamptz,
      nullif(elem->>'reply_date', '')::timestamptz,
      coalesce((elem->>'has_reply')::boolean, false),
      elem->>'status',
      elem->>'google_name',
      elem->>'review_url',
      now(),
      elem->>'sentiment'
    from jsonb_array_elements(coalesce(p_reviews, '[]'::jsonb)) elem
    join public.gmb_locations loc
      on loc.location_id = elem->>'google_location_id'
     and loc.gmb_account_id = p_account_id
    on conflict (external_review_id) do update set
      reviewer_name = excluded.reviewer_name,
      reviewer_display_name = excluded.reviewer_display_name,
      reviewer_profile_photo_url = excluded.reviewer_profile_photo_url,
      rating = excluded.rating,
      review_text = excluded.review_text,
      response = excluded.response,
      reply_date = excluded.reply_date,
      responded_at = excluded.responded_at,
      has_reply = excluded.has_reply,
      status = excluded.status,
      review_url = excluded.review_url,
      ai_sentiment = excluded.ai_sentiment,
      synced_at = now()
    returning 1
  )
  select count(*) into v_reviews_synced from upsert_reviews;

  with upsert_questions as (
    insert into public.gmb_questions (
      user_id,
      location_id,
      gmb_account_id,
      question_id,
      external_question_id,
      question_text,
      asked_at,
      author_name,
      author_display_name,
      author_profile_photo_url,
      author_type,
      answer_text,
      answered_at,
      answered_by,
      answer_status,
      status,
      answer_id,
      upvote_count,
      total_answer_count,
      google_resource_name,
      synced_at
    )
    select
      v_user_id,
      loc.id,
      loc.gmb_account_id,
      elem->>'question_id',
      elem->>'question_id',
      elem->>'question_text',
      nullif(elem->>'question_date', '')::timestamptz,
      elem->>'author_name',
      elem->>'author_name',
      elem->>'author_photo',
      coalesce(elem->>'author_type', 'CUSTOMER'),
      elem->>'answer_text',
      nullif(elem->>'answer_date', '')::timestamptz,
      elem->>'answer_author',
      elem->>'status',
      elem->>'status',
      elem->>'answer_id',
      nullif(elem->>'upvote_count', '')::int,
      nullif(elem->>'total_answer_count', '')::int,
      elem->>'google_resource_name',
      now()
    from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) elem
    join public.gmb_locations loc
      on loc.location_id = elem->>'google_location_id'
     and loc.gmb_account_id = p_account_id
    on conflict (question_id) do update set
      author_name = excluded.author_name,
      author_display_name = excluded.author_display_name,
      author_profile_photo_url = excluded.author_profile_photo_url,
      author_type = excluded.author_type,
      question_text = excluded.question_text,
      answer_text = excluded.answer_text,
      answered_at = excluded.answered_at,
      answered_by = excluded.answered_by,
      answer_status = excluded.answer_status,
      status = excluded.status,
      answer_id = excluded.answer_id,
      upvote_count = excluded.upvote_count,
      total_answer_count = excluded.total_answer_count,
      google_resource_name = excluded.google_resource_name,
      synced_at = now()
    returning 1
  )
  select count(*) into v_questions_synced from upsert_questions;

  update public.gmb_accounts
  set last_sync = now()
  where id = p_account_id;

  update public.sync_progress
  set
    status = 'completed',
    completed_at = now(),
    synced_locations = v_locations_synced,
    synced_reviews = v_reviews_synced,
    synced_questions = v_questions_synced
  where id = v_sync_id;

  v_result := jsonb_build_object(
    'success', true,
    'sync_id', v_sync_id,
    'locations_synced', v_locations_synced,
    'reviews_synced', v_reviews_synced,
    'questions_synced', v_questions_synced
  );

  return v_result;

exception
  when others then
    update public.sync_progress
    set
      status = 'failed',
      error_message = SQLERRM,
      error_details = jsonb_build_object(
        'error_code', SQLSTATE,
        'error_message', SQLERRM,
        'stack_trace', pg_catalog.pg_backtrace()
      ),
      completed_at = now()
    where id = v_sync_id;

    raise;
end;
$$;

