create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create schema if not exists "pgmq";

create extension if not exists "pgmq" with schema "pgmq";

create extension if not exists "pg_net" with schema "public";

drop trigger if exists "update_brand_profiles_updated_at" on "public"."brand_profiles";

drop trigger if exists "update_gmb_accounts_updated_at" on "public"."gmb_accounts";

drop trigger if exists "trigger_refresh_stats_on_location_delete" on "public"."gmb_locations";

drop trigger if exists "trigger_refresh_stats_on_location_insert" on "public"."gmb_locations";

drop trigger if exists "trigger_refresh_stats_on_location_update" on "public"."gmb_locations";

drop trigger if exists "update_gmb_locations_updated_at" on "public"."gmb_locations";

drop trigger if exists "update_gmb_media_updated_at" on "public"."gmb_media";

drop trigger if exists "update_gmb_posts_updated_at" on "public"."gmb_posts";

drop trigger if exists "update_gmb_questions_updated_at" on "public"."gmb_questions";

drop trigger if exists "trigger_refresh_stats_on_review_delete" on "public"."gmb_reviews";

drop trigger if exists "trigger_refresh_stats_on_review_insert" on "public"."gmb_reviews";

drop trigger if exists "trigger_refresh_stats_on_review_update" on "public"."gmb_reviews";

drop trigger if exists "update_gmb_reviews_updated_at" on "public"."gmb_reviews";

drop trigger if exists "update_gmb_secrets_updated_at" on "public"."gmb_secrets";

drop trigger if exists "set_updated_at_gmb_services" on "public"."gmb_services";

drop trigger if exists "update_profiles_updated_at" on "public"."profiles";

drop trigger if exists "update_question_templates_updated_at" on "public"."question_templates";

drop trigger if exists "trigger_update_review_reply_drafts_updated_at" on "public"."review_reply_drafts";

drop trigger if exists "update_sync_queue_updated_at" on "public"."sync_queue";

drop trigger if exists "update_sync_status_updated_at" on "public"."sync_status";

drop trigger if exists "update_team_invitations_updated_at" on "public"."team_invitations";

drop trigger if exists "update_team_members_updated_at" on "public"."team_members";

drop trigger if exists "update_teams_updated_at" on "public"."teams";

drop trigger if exists "trigger_user_preferences_updated_at" on "public"."user_preferences";

drop policy "Only team owners and admins can create invitations" on "public"."team_invitations";

drop policy "Team members can view invitations" on "public"."team_invitations";

drop policy "Only team owners and admins can add members" on "public"."team_members";

drop policy "Only team owners and admins can remove members" on "public"."team_members";

drop policy "Only team owners and admins can update members" on "public"."team_members";

drop policy "Team members can view other members" on "public"."team_members";

drop policy "Users can view teams they own or are members of" on "public"."teams";

drop policy "teams_member_access" on "public"."teams";

alter table "public"."gmb_locations" drop constraint "gmb_locations_gmb_account_id_fkey";

alter table "public"."gmb_media" drop constraint "gmb_media_gmb_account_id_fkey";

alter table "public"."gmb_media" drop constraint "gmb_media_location_id_fkey";

alter table "public"."gmb_performance_metrics" drop constraint "gmb_performance_metrics_gmb_account_id_fkey";

alter table "public"."gmb_posts" drop constraint "gmb_posts_location_id_fkey";

alter table "public"."gmb_questions" drop constraint "gmb_questions_gmb_account_id_fkey";

alter table "public"."gmb_questions" drop constraint "gmb_questions_location_id_fkey";

alter table "public"."gmb_reviews" drop constraint "gmb_reviews_gmb_account_id_fkey";

alter table "public"."gmb_reviews" drop constraint "gmb_reviews_location_id_fkey";

alter table "public"."gmb_secrets" drop constraint "gmb_secrets_account_id_fkey";

alter table "public"."gmb_services" drop constraint "gmb_services_gmb_account_id_fkey";

alter table "public"."gmb_services" drop constraint "gmb_services_location_id_fkey";

alter table "public"."review_reply_drafts" drop constraint "review_reply_drafts_review_id_fkey";

alter table "public"."sync_queue" drop constraint "sync_queue_account_id_fkey";

alter table "public"."sync_status" drop constraint "sync_status_account_id_fkey";

alter table "public"."team_invitations" drop constraint "team_invitations_team_id_fkey";

alter table "public"."team_members" drop constraint "team_members_team_id_fkey";

alter table "public"."user_preferences" drop constraint "user_preferences_selected_location_id_fkey";

drop function if exists "public"."update_user_achievements"(p_user_id uuid);


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "resource" text,
    "details" jsonb default '{}'::jsonb,
    "ip_address" inet,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "message" text not null,
    "link" text,
    "metadata" jsonb default '{}'::jsonb,
    "read" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."weekly_task_recommendations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "task_type" text not null,
    "title" text not null,
    "description" text,
    "priority" integer default 0,
    "status" text default 'pending'::text,
    "due_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."weekly_task_recommendations" enable row level security;

alter table "public"."gmb_accounts" add column "delete_on_disconnect" boolean default false;

alter table "public"."gmb_accounts" add column "disconnected_at" timestamp with time zone;

alter table "public"."gmb_questions" add column "ai_category" text;

alter table "public"."gmb_reviews" add column "ai_sentiment" text;

alter table "public"."gmb_reviews" add column "comment" text;

alter table "public"."gmb_reviews" add column "external_review_id" text;

alter table "public"."gmb_reviews" add column "has_response" boolean default false;

alter table "public"."gmb_reviews" add column "replied_at" timestamp with time zone;

alter table "public"."gmb_reviews" add column "responded_at" timestamp with time zone;

alter table "public"."gmb_reviews" add column "response_text" text;

alter table "public"."gmb_reviews" add column "review_reply" text;

alter table "public"."oauth_states" add column "updated_at" timestamp with time zone default now();

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (user_id, read) WHERE (read = false);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_weekly_tasks_status ON public.weekly_task_recommendations USING btree (status);

CREATE INDEX idx_weekly_tasks_user_id ON public.weekly_task_recommendations USING btree (user_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX weekly_task_recommendations_pkey ON public.weekly_task_recommendations USING btree (id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."weekly_task_recommendations" add constraint "weekly_task_recommendations_pkey" PRIMARY KEY using index "weekly_task_recommendations_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['review'::text, 'insight'::text, 'achievement'::text, 'alert'::text, 'update'::text, 'system'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."weekly_task_recommendations" add constraint "weekly_task_recommendations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'skipped'::text]))) not valid;

alter table "public"."weekly_task_recommendations" validate constraint "weekly_task_recommendations_status_check";

alter table "public"."weekly_task_recommendations" add constraint "weekly_task_recommendations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."weekly_task_recommendations" validate constraint "weekly_task_recommendations_user_id_fkey";

alter table "public"."gmb_locations" add constraint "gmb_locations_gmb_account_id_fkey" FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_locations" validate constraint "gmb_locations_gmb_account_id_fkey";

alter table "public"."gmb_media" add constraint "gmb_media_gmb_account_id_fkey" FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_media" validate constraint "gmb_media_gmb_account_id_fkey";

alter table "public"."gmb_media" add constraint "gmb_media_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_media" validate constraint "gmb_media_location_id_fkey";

alter table "public"."gmb_performance_metrics" add constraint "gmb_performance_metrics_gmb_account_id_fkey" FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_performance_metrics" validate constraint "gmb_performance_metrics_gmb_account_id_fkey";

alter table "public"."gmb_posts" add constraint "gmb_posts_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_posts" validate constraint "gmb_posts_location_id_fkey";

alter table "public"."gmb_questions" add constraint "gmb_questions_gmb_account_id_fkey" FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_questions" validate constraint "gmb_questions_gmb_account_id_fkey";

alter table "public"."gmb_questions" add constraint "gmb_questions_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_questions" validate constraint "gmb_questions_location_id_fkey";

alter table "public"."gmb_reviews" add constraint "gmb_reviews_gmb_account_id_fkey" FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_reviews" validate constraint "gmb_reviews_gmb_account_id_fkey";

alter table "public"."gmb_reviews" add constraint "gmb_reviews_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_reviews" validate constraint "gmb_reviews_location_id_fkey";

alter table "public"."gmb_secrets" add constraint "gmb_secrets_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_secrets" validate constraint "gmb_secrets_account_id_fkey";

alter table "public"."gmb_services" add constraint "gmb_services_gmb_account_id_fkey" FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_services" validate constraint "gmb_services_gmb_account_id_fkey";

alter table "public"."gmb_services" add constraint "gmb_services_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE not valid;

alter table "public"."gmb_services" validate constraint "gmb_services_location_id_fkey";

alter table "public"."review_reply_drafts" add constraint "review_reply_drafts_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.gmb_reviews(id) ON DELETE CASCADE not valid;

alter table "public"."review_reply_drafts" validate constraint "review_reply_drafts_review_id_fkey";

alter table "public"."sync_queue" add constraint "sync_queue_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."sync_queue" validate constraint "sync_queue_account_id_fkey";

alter table "public"."sync_status" add constraint "sync_status_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."sync_status" validate constraint "sync_status_account_id_fkey";

alter table "public"."team_invitations" add constraint "team_invitations_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."team_invitations" validate constraint "team_invitations_team_id_fkey";

alter table "public"."team_members" add constraint "team_members_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE not valid;

alter table "public"."team_members" validate constraint "team_members_team_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_selected_location_id_fkey" FOREIGN KEY (selected_location_id) REFERENCES public.gmb_locations(id) ON DELETE SET NULL not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_selected_location_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.initialize_user_progress(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO user_progress (user_id, current_level, total_points, streak_days)
  VALUES (p_user_id, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_achievements (user_id, achievement_id, achievement_name, achievement_description, category, points, level, max_progress)
  VALUES
    (p_user_id, 'first_review_reply', 'First Response', 'Reply to your first review', 'reviews', 10, 'bronze', 1),
    (p_user_id, 'review_master_10', 'Review Master', 'Reply to 10 reviews', 'reviews', 50, 'silver', 10),
    (p_user_id, 'review_champion_50', 'Review Champion', 'Reply to 50 reviews', 'reviews', 200, 'gold', 50),
    (p_user_id, 'first_post', 'Content Creator', 'Create your first post', 'engagement', 10, 'bronze', 1),
    (p_user_id, 'weekly_poster', 'Weekly Poster', 'Post content for 4 consecutive weeks', 'engagement', 100, 'silver', 4),
    (p_user_id, 'rating_boost', 'Rating Booster', 'Improve your average rating by 0.5 stars', 'growth', 150, 'gold', 1),
    (p_user_id, 'streak_7', 'Week Warrior', 'Maintain a 7-day activity streak', 'special', 75, 'silver', 7),
    (p_user_id, 'streak_30', 'Monthly Master', 'Maintain a 30-day activity streak', 'special', 300, 'platinum', 30)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$function$
;

create or replace view "public"."user_home_stats" as  SELECT u.id AS user_id,
    count(DISTINCT l.id) AS total_locations,
    count(DISTINCT
        CASE
            WHEN (r.created_at >= (now() - '7 days'::interval)) THEN r.id
            ELSE NULL::uuid
        END) AS reviews_this_week,
    count(DISTINCT
        CASE
            WHEN (q.created_at >= (now() - '7 days'::interval)) THEN q.id
            ELSE NULL::uuid
        END) AS questions_this_week,
    COALESCE(avg(l.rating), (0)::numeric) AS avg_rating,
    count(DISTINCT
        CASE
            WHEN (r.has_reply = false) THEN r.id
            ELSE NULL::uuid
        END) AS pending_reviews
   FROM (((auth.users u
     LEFT JOIN public.gmb_locations l ON (((l.user_id = u.id) AND (l.is_active = true))))
     LEFT JOIN public.gmb_reviews r ON ((r.user_id = u.id)))
     LEFT JOIN public.gmb_questions q ON ((q.user_id = u.id)))
  GROUP BY u.id;


grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."weekly_task_recommendations" to "anon";

grant insert on table "public"."weekly_task_recommendations" to "anon";

grant references on table "public"."weekly_task_recommendations" to "anon";

grant select on table "public"."weekly_task_recommendations" to "anon";

grant trigger on table "public"."weekly_task_recommendations" to "anon";

grant truncate on table "public"."weekly_task_recommendations" to "anon";

grant update on table "public"."weekly_task_recommendations" to "anon";

grant delete on table "public"."weekly_task_recommendations" to "authenticated";

grant insert on table "public"."weekly_task_recommendations" to "authenticated";

grant references on table "public"."weekly_task_recommendations" to "authenticated";

grant select on table "public"."weekly_task_recommendations" to "authenticated";

grant trigger on table "public"."weekly_task_recommendations" to "authenticated";

grant truncate on table "public"."weekly_task_recommendations" to "authenticated";

grant update on table "public"."weekly_task_recommendations" to "authenticated";

grant delete on table "public"."weekly_task_recommendations" to "service_role";

grant insert on table "public"."weekly_task_recommendations" to "service_role";

grant references on table "public"."weekly_task_recommendations" to "service_role";

grant select on table "public"."weekly_task_recommendations" to "service_role";

grant trigger on table "public"."weekly_task_recommendations" to "service_role";

grant truncate on table "public"."weekly_task_recommendations" to "service_role";

grant update on table "public"."weekly_task_recommendations" to "service_role";


  create policy "Service can insert audit logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can insert their own audit logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can read own audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can manage own notifications"
  on "public"."notifications"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Users can manage own tasks"
  on "public"."weekly_task_recommendations"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Only team owners and admins can create invitations"
  on "public"."team_invitations"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_invitations.team_id) AND (team_members.user_id = auth.uid()) AND ((team_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));



  create policy "Team members can view invitations"
  on "public"."team_invitations"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_invitations.team_id) AND (team_members.user_id = auth.uid())))) OR ((auth.jwt() ->> 'email'::text) = (email)::text)));



  create policy "Only team owners and admins can add members"
  on "public"."team_members"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.team_members team_members_1
  WHERE ((team_members_1.team_id = team_members_1.team_id) AND (team_members_1.user_id = auth.uid()) AND ((team_members_1.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));



  create policy "Only team owners and admins can remove members"
  on "public"."team_members"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_members.team_id) AND (tm.user_id = auth.uid()) AND ((tm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));



  create policy "Only team owners and admins can update members"
  on "public"."team_members"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_members.team_id) AND (tm.user_id = auth.uid()) AND ((tm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));



  create policy "Team members can view other members"
  on "public"."team_members"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_members.team_id) AND (tm.user_id = auth.uid())))));



  create policy "Users can view teams they own or are members of"
  on "public"."teams"
  as permissive
  for select
  to public
using (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()))))));



  create policy "teams_member_access"
  on "public"."teams"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid())))));


CREATE TRIGGER update_brand_profiles_updated_at BEFORE UPDATE ON public.brand_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gmb_accounts_updated_at BEFORE UPDATE ON public.gmb_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_refresh_stats_on_location_delete AFTER DELETE ON public.gmb_locations FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_home_stats();

CREATE TRIGGER trigger_refresh_stats_on_location_insert AFTER INSERT ON public.gmb_locations FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_home_stats();

CREATE TRIGGER trigger_refresh_stats_on_location_update AFTER UPDATE ON public.gmb_locations FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_home_stats();

CREATE TRIGGER update_gmb_locations_updated_at BEFORE UPDATE ON public.gmb_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gmb_media_updated_at BEFORE UPDATE ON public.gmb_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gmb_posts_updated_at BEFORE UPDATE ON public.gmb_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gmb_questions_updated_at BEFORE UPDATE ON public.gmb_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_refresh_stats_on_review_delete AFTER DELETE ON public.gmb_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_home_stats();

CREATE TRIGGER trigger_refresh_stats_on_review_insert AFTER INSERT ON public.gmb_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_home_stats();

CREATE TRIGGER trigger_refresh_stats_on_review_update AFTER UPDATE ON public.gmb_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_home_stats();

CREATE TRIGGER update_gmb_reviews_updated_at BEFORE UPDATE ON public.gmb_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_gmb_secrets_updated_at BEFORE UPDATE ON public.gmb_secrets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_gmb_services BEFORE UPDATE ON public.gmb_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_question_templates_updated_at BEFORE UPDATE ON public.question_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_review_reply_drafts_updated_at BEFORE UPDATE ON public.review_reply_drafts FOR EACH ROW EXECUTE FUNCTION public.update_review_reply_drafts_updated_at();

CREATE TRIGGER update_sync_queue_updated_at BEFORE UPDATE ON public.sync_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON public.sync_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON public.team_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_user_preferences_updated_at();


