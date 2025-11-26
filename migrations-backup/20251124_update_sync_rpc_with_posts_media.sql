-- Migration: Update sync_gmb_data_transactional RPC to support posts and media
-- Created: 2025-11-24
-- Description: Extends the transactional sync RPC to accept and process posts and media data

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.sync_gmb_data_transactional(uuid, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.sync_gmb_data_transactional(uuid, jsonb, jsonb, jsonb, jsonb, jsonb);

-- Create updated function with posts and media support
CREATE OR REPLACE FUNCTION public.sync_gmb_data_transactional(
  p_account_id UUID,
  p_locations JSONB,
  p_reviews JSONB,
  p_questions JSONB,
  p_posts JSONB DEFAULT '[]'::jsonb,
  p_media JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sync_id UUID;
  v_locations_synced INT := 0;
  v_reviews_synced INT := 0;
  v_questions_synced INT := 0;
  v_posts_synced INT := 0;
  v_media_synced INT := 0;
  v_location JSONB;
  v_review JSONB;
  v_question JSONB;
  v_post JSONB;
  v_media_item JSONB;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Create sync queue entry
    INSERT INTO public.sync_queue (
      gmb_account_id,
      status,
      started_at,
      metadata
    )
    VALUES (
      p_account_id,
      'processing',
      NOW(),
      jsonb_build_object(
        'locations_count', jsonb_array_length(p_locations),
        'reviews_count', jsonb_array_length(p_reviews),
        'questions_count', jsonb_array_length(p_questions),
        'posts_count', jsonb_array_length(p_posts),
        'media_count', jsonb_array_length(p_media)
      )
    )
    RETURNING id INTO v_sync_id;

    -- Sync Locations
    FOR v_location IN SELECT * FROM jsonb_array_elements(p_locations)
    LOOP
      INSERT INTO public.gmb_locations (
        id,
        gmb_account_id,
        user_id,
        location_id,
        normalized_location_id,
        name,
        address,
        phone,
        website,
        categories,
        rating,
        review_count,
        latitude,
        longitude,
        profile_completeness,
        is_active,
        status,
        metadata,
        last_synced_at,
        updated_at
      )
      VALUES (
        COALESCE((v_location->>'id')::uuid, gen_random_uuid()),
        (v_location->>'gmb_account_id')::uuid,
        (v_location->>'user_id')::uuid,
        v_location->>'location_id',
        v_location->>'normalized_location_id',
        v_location->>'location_name',
        v_location->>'address',
        v_location->>'phone',
        v_location->>'website',
        v_location->'categories',
        (v_location->>'rating')::numeric,
        (v_location->>'review_count')::integer,
        (v_location->>'latitude')::numeric,
        (v_location->>'longitude')::numeric,
        (v_location->>'profile_completeness')::numeric,
        COALESCE((v_location->>'is_active')::boolean, true),
        v_location->>'status',
        v_location->'metadata',
        (v_location->>'last_synced_at')::timestamptz,
        NOW()
      )
      ON CONFLICT (location_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        categories = EXCLUDED.categories,
        rating = EXCLUDED.rating,
        review_count = EXCLUDED.review_count,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        profile_completeness = EXCLUDED.profile_completeness,
        is_active = EXCLUDED.is_active,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        last_synced_at = EXCLUDED.last_synced_at,
        updated_at = NOW();

      v_locations_synced := v_locations_synced + 1;
    END LOOP;

    -- Sync Reviews
    FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews)
    LOOP
      INSERT INTO public.gmb_reviews (
        user_id,
        location_id,
        google_location_id,
        gmb_account_id,
        external_review_id,
        reviewer_display_name,
        star_rating,
        comment,
        review_reply,
        create_time,
        update_time,
        has_reply,
        sentiment,
        metadata,
        synced_at
      )
      VALUES (
        (v_review->>'user_id')::uuid,
        COALESCE((v_review->>'location_id')::uuid,
          (SELECT id FROM public.gmb_locations WHERE location_id = v_review->>'google_location_id' LIMIT 1)),
        v_review->>'google_location_id',
        COALESCE((v_review->>'gmb_account_id')::uuid, p_account_id),
        v_review->>'review_id',
        COALESCE(v_review->>'reviewer_display_name', v_review->>'reviewer_name'),
        (v_review->>'rating')::integer,
        v_review->>'review_text',
        v_review->>'reply_text',
        (v_review->>'review_date')::timestamptz,
        (v_review->>'review_date')::timestamptz,
        COALESCE((v_review->>'has_reply')::boolean, false),
        v_review->>'sentiment',
        jsonb_build_object('synced_at', NOW()),
        NOW()
      )
      ON CONFLICT (external_review_id)
      DO UPDATE SET
        star_rating = EXCLUDED.star_rating,
        comment = EXCLUDED.comment,
        review_reply = EXCLUDED.review_reply,
        has_reply = EXCLUDED.has_reply,
        sentiment = EXCLUDED.sentiment,
        synced_at = NOW();

      v_reviews_synced := v_reviews_synced + 1;
    END LOOP;

    -- Sync Questions
    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
      INSERT INTO public.gmb_questions (
        user_id,
        location_id,
        gmb_account_id,
        external_question_id,
        question_text,
        author_name,
        author_type,
        answer_text,
        answered_at,
        answered_by,
        answer_status,
        upvote_count,
        total_answer_count,
        metadata,
        created_at,
        synced_at
      )
      VALUES (
        (v_question->>'user_id')::uuid,
        COALESCE((v_question->>'location_id')::uuid,
          (SELECT id FROM public.gmb_locations WHERE location_id = v_question->>'google_location_id' LIMIT 1)),
        COALESCE((v_question->>'gmb_account_id')::uuid, p_account_id),
        v_question->>'question_id',
        v_question->>'question_text',
        COALESCE(v_question->>'author_display_name', v_question->>'author_name'),
        v_question->>'author_type',
        v_question->>'answer_text',
        (v_question->>'answer_date')::timestamptz,
        v_question->>'answer_author',
        CASE
          WHEN v_question->>'answer_text' IS NOT NULL THEN 'answered'
          ELSE 'pending'
        END,
        (v_question->>'upvote_count')::integer,
        (v_question->>'total_answer_count')::integer,
        jsonb_build_object('synced_at', NOW()),
        (v_question->>'question_date')::timestamptz,
        NOW()
      )
      ON CONFLICT (external_question_id)
      DO UPDATE SET
        question_text = EXCLUDED.question_text,
        answer_text = EXCLUDED.answer_text,
        answered_at = EXCLUDED.answered_at,
        answered_by = EXCLUDED.answered_by,
        answer_status = EXCLUDED.answer_status,
        upvote_count = EXCLUDED.upvote_count,
        total_answer_count = EXCLUDED.total_answer_count,
        synced_at = NOW();

      v_questions_synced := v_questions_synced + 1;
    END LOOP;

    -- Sync Posts (if provided)
    IF jsonb_array_length(p_posts) > 0 THEN
      FOR v_post IN SELECT * FROM jsonb_array_elements(p_posts)
      LOOP
        INSERT INTO public.gmb_posts (
          user_id,
          location_id,
          gmb_account_id,
          provider_post_id,
          title,
          content,
          media_url,
          post_type,
          status,
          published_at,
          scheduled_at,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          (v_post->>'user_id')::uuid,
          (v_post->>'location_id')::uuid,
          (v_post->>'gmb_account_id')::uuid,
          v_post->>'provider_post_id',
          v_post->>'title',
          v_post->>'content',
          v_post->>'media_url',
          COALESCE(v_post->>'post_type', 'whats_new'),
          COALESCE(v_post->>'status', 'published'),
          (v_post->>'published_at')::timestamptz,
          (v_post->>'scheduled_at')::timestamptz,
          v_post->'metadata',
          COALESCE((v_post->>'created_at')::timestamptz, NOW()),
          NOW()
        )
        ON CONFLICT (provider_post_id)
        WHERE provider_post_id IS NOT NULL
        DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          media_url = EXCLUDED.media_url,
          status = EXCLUDED.status,
          published_at = EXCLUDED.published_at,
          metadata = EXCLUDED.metadata,
          updated_at = NOW();

        v_posts_synced := v_posts_synced + 1;
      END LOOP;
    END IF;

    -- Sync Media (if provided)
    IF jsonb_array_length(p_media) > 0 THEN
      FOR v_media_item IN SELECT * FROM jsonb_array_elements(p_media)
      LOOP
        INSERT INTO public.gmb_media (
          user_id,
          location_id,
          gmb_account_id,
          external_media_id,
          media_format,
          source_url,
          google_url,
          thumbnail_url,
          description,
          location_association,
          metadata,
          created_at
        )
        VALUES (
          (v_media_item->>'user_id')::uuid,
          (v_media_item->>'location_id')::uuid,
          (v_media_item->>'gmb_account_id')::uuid,
          v_media_item->>'external_media_id',
          COALESCE(v_media_item->>'media_format', 'PHOTO'),
          v_media_item->>'source_url',
          v_media_item->>'google_url',
          v_media_item->>'thumbnail_url',
          v_media_item->>'description',
          v_media_item->>'location_association',
          v_media_item->'metadata',
          COALESCE((v_media_item->>'created_at')::timestamptz, NOW())
        )
        ON CONFLICT (external_media_id)
        DO UPDATE SET
          source_url = EXCLUDED.source_url,
          google_url = EXCLUDED.google_url,
          thumbnail_url = EXCLUDED.thumbnail_url,
          description = EXCLUDED.description,
          metadata = EXCLUDED.metadata;

        v_media_synced := v_media_synced + 1;
      END LOOP;
    END IF;

    -- Update sync queue entry
    UPDATE public.sync_queue
    SET
      status = 'completed',
      completed_at = NOW(),
      metadata = jsonb_build_object(
        'locations_synced', v_locations_synced,
        'reviews_synced', v_reviews_synced,
        'questions_synced', v_questions_synced,
        'posts_synced', v_posts_synced,
        'media_synced', v_media_synced
      )
    WHERE id = v_sync_id;

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'sync_id', v_sync_id,
      'locations_synced', v_locations_synced,
      'reviews_synced', v_reviews_synced,
      'questions_synced', v_questions_synced,
      'posts_synced', v_posts_synced,
      'media_synced', v_media_synced
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    IF v_sync_id IS NOT NULL THEN
      UPDATE public.sync_queue
      SET
        status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM
      WHERE id = v_sync_id;
    END IF;

    RAISE EXCEPTION 'Sync transaction failed: %', SQLERRM;
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_gmb_data_transactional TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_gmb_data_transactional TO service_role;

-- Add comment
COMMENT ON FUNCTION public.sync_gmb_data_transactional IS
'Transactional sync for GMB data including locations, reviews, questions, posts, and media.
Posts and media are optional parameters with default empty arrays.';
