# NNH AI Studio - Project Structure

> **Generated:** 2025-11-06 22:14:53  
> **Project:** NNH AI Studio - Professional GMB & YouTube Management Platform  
> **Framework:** Next.js 14 (App Router)  
> **Database:** Supabase (PostgreSQL)

---

## 📁 Directory Tree

```
.
|-- app
|   |-- [locale]
|   |   |-- (auth)
|   |   |   |-- login
|   |   |   |-- signup
|   |   |   `-- layout.tsx
|   |   |-- (dashboard)
|   |   |   |-- analytics
|   |   |   |-- approvals
|   |   |   |-- automation
|   |   |   |-- calendar
|   |   |   |-- dashboard
|   |   |   |-- features
|   |   |   |-- gmb-posts
|   |   |   |-- grid-tracking
|   |   |   |-- locations
|   |   |   |-- media
|   |   |   |-- posts
|   |   |   |-- questions
|   |   |   |-- reviews
|   |   |   |-- settings
|   |   |   |-- team
|   |   |   |-- webhooks
|   |   |   |-- youtube-posts
|   |   |   |-- layout.tsx
|   |   |   `-- not-found.tsx
|   |   |-- about
|   |   |   `-- page.tsx
|   |   |-- auth
|   |   |   |-- callback
|   |   |   |-- error
|   |   |   |-- login
|   |   |   |-- reset
|   |   |   |-- signout
|   |   |   |-- signup
|   |   |   |-- signup-success
|   |   |   `-- update-password
|   |   |-- home
|   |   |   `-- page.tsx
|   |   |-- pricing
|   |   |   |-- contact
|   |   |   `-- page.tsx
|   |   |-- privacy
|   |   |   `-- page.tsx
|   |   |-- terms
|   |   |   `-- page.tsx
|   |   |-- youtube-dashboard
|   |   |   `-- page.tsx
|   |   |-- error.tsx
|   |   |-- landing.tsx
|   |   |-- layout.tsx
|   |   |-- not-found.tsx
|   |   `-- page.tsx
|   |-- api
|   |   |-- ai
|   |   |   |-- generate
|   |   |   |-- generate-post
|   |   |   |-- generate-response
|   |   |   `-- generate-review-reply
|   |   |-- auth
|   |   |   |-- send-change-email
|   |   |   |-- send-invite
|   |   |   |-- send-magic-link
|   |   |   |-- send-reauth
|   |   |   `-- send-reset-password
|   |   |-- dashboard
|   |   |   `-- stats
|   |   |-- email
|   |   |   |-- send
|   |   |   `-- sendgrid
|   |   |-- gmb
|   |   |   |-- accounts
|   |   |   |-- attributes
|   |   |   |-- categories
|   |   |   |-- chains
|   |   |   |-- create-auth-url
|   |   |   |-- disconnect
|   |   |   |-- google-locations
|   |   |   |-- location
|   |   |   |-- media
|   |   |   |-- oauth-callback
|   |   |   |-- posts
|   |   |   |-- questions
|   |   |   |-- scheduled-sync
|   |   |   |-- sync
|   |   |   |-- test-attributes
|   |   |   `-- test-qa
|   |   |-- google-maps-config
|   |   |   `-- route.ts
|   |   |-- locations
|   |   |   |-- [id]
|   |   |   |-- bulk-delete
|   |   |   |-- bulk-publish
|   |   |   |-- bulk-sync
|   |   |   |-- competitor-data
|   |   |   |-- export
|   |   |   |-- list-data
|   |   |   |-- map-data
|   |   |   |-- stats
|   |   |   `-- route.ts
|   |   |-- notifications
|   |   |   |-- create
|   |   |   `-- route.ts
|   |   |-- reviews
|   |   |   |-- [id]
|   |   |   |-- ai-response
|   |   |   |-- pending
|   |   |   |-- send-reply
|   |   |   |-- sentiment
|   |   |   |-- stats
|   |   |   `-- route.ts
|   |   |-- tasks
|   |   |   `-- update
|   |   |-- upload
|   |   |   `-- image
|   |   `-- youtube
|   |       |-- analytics
|   |       |-- comments
|   |       |-- composer
|   |       |-- create-auth-url
|   |       |-- disconnect
|   |       |-- oauth-callback
|   |       |-- refresh
|   |       |-- token
|   |       `-- videos
|   |-- global-error.tsx
|   |-- globals.css
|   |-- layout.tsx
|   `-- providers.tsx
|-- code-auditor
|   |-- audit-reports
|   |   |-- ANALYSIS_locations_2025-11-05T13-05-12-897Z.json
|   |   |-- SURGICAL_FIX_locations_2025-11-05T12-02-20-970Z.md
|   |   `-- SURGICAL_FIX_locations_2025-11-05T13-05-12-897Z.md
|   |-- public
|   |   |-- app.js
|   |   |-- index.html
|   |   |-- script.js
|   |   `-- styles.css
|   |-- src
|   |   |-- claudeClient.js
|   |   |-- fileHandler.js
|   |   |-- generateFixPrompt.js
|   |   |-- index.js
|   |   |-- prompts.js
|   |   |-- surgicalFixPrompt.js
|   |   `-- ultraDeepPrompt.js
|   |-- .gitignore
|   |-- .replit
|   |-- .replitrc
|   |-- HOW_TO_USE.md
|   |-- README.md
|   |-- package-lock.json
|   |-- package.json
|   `-- replit.nix
|-- components
|   |-- accounts
|   |   |-- AccountCard.tsx
|   |   `-- NoAccountsPlaceholder.tsx
|   |-- ai
|   |   `-- ai-assistant.tsx
|   |-- ai-studio
|   |   |-- content-generator.tsx
|   |   `-- content-history.tsx
|   |-- analytics
|   |   |-- analytics-dashboard.tsx
|   |   |-- impressions-breakdown-chart.tsx
|   |   |-- location-performance.tsx
|   |   |-- metrics-overview.tsx
|   |   |-- performance-metrics-chart.tsx
|   |   |-- response-time-chart.tsx
|   |   |-- review-sentiment-chart.tsx
|   |   |-- search-keywords.tsx
|   |   `-- traffic-chart.tsx
|   |-- attributes
|   |   `-- attributes-manager.tsx
|   |-- auth
|   |   |-- oauth-buttons.tsx
|   |   `-- user-button.tsx
|   |-- dashboard
|   |   |-- achievement-badges.tsx
|   |   |-- activity-feed.tsx
|   |   |-- ai-copilot-enhanced.tsx
|   |   |-- ai-insights-card.tsx
|   |   |-- ai-insights-widget.tsx
|   |   |-- bottlenecks-widget.tsx
|   |   |-- completion-score-widget.tsx
|   |   |-- dashboard-error-boundary.tsx
|   |   |-- date-range-controls.tsx
|   |   |-- export-share-bar.tsx
|   |   |-- gamification-widget.tsx
|   |   |-- gmb-posts-section.tsx
|   |   |-- gmb-sidebar.tsx
|   |   |-- last-sync-info.tsx
|   |   |-- lazy-dashboard-components.tsx
|   |   |-- location-highlights-carousel.tsx
|   |   |-- performance-chart.tsx
|   |   |-- performance-comparison-chart.tsx
|   |   |-- performance-snapshot.tsx
|   |   |-- profile-protection-status.tsx
|   |   |-- quick-actions-bar.tsx
|   |   |-- realtime-updates-indicator.tsx
|   |   |-- responsive-layout.tsx
|   |   |-- smart-checklist.tsx
|   |   |-- stat-card.tsx
|   |   |-- stats-cards.tsx
|   |   |-- weekly-tasks-widget.tsx
|   |   |-- welcome-hero.tsx
|   |   `-- youtube-sidebar.tsx
|   |-- insights
|   |   `-- business-insights.tsx
|   |-- keyboard
|   |   |-- keyboard-provider.tsx
|   |   `-- shortcuts-modal.tsx
|   |-- layout
|   |   |-- command-palette.tsx
|   |   |-- header.tsx
|   |   |-- mobile-nav.tsx
|   |   |-- public-footer.tsx
|   |   |-- public-header.tsx
|   |   `-- sidebar.tsx
|   |-- locations
|   |   |-- charts
|   |   |   |-- location-category-comparison-chart.tsx
|   |   |   |-- location-health-score-distribution-chart.tsx
|   |   |   |-- location-rating-trend-chart.tsx
|   |   |   `-- location-reviews-over-time-chart.tsx
|   |   |-- map-cards
|   |   |   |-- activity-feed-card.tsx
|   |   |   |-- floating-card.tsx
|   |   |   |-- index.ts
|   |   |   |-- location-details-card.tsx
|   |   |   |-- quick-actions-card.tsx
|   |   |   `-- stats-overview-card.tsx
|   |   |-- LocationMapDashboard.tsx
|   |   |-- add-location-dialog.tsx
|   |   |-- edit-location-dialog.tsx
|   |   |-- enhanced-location-card.tsx
|   |   |-- gmb-connection-banner.tsx
|   |   |-- google-updated-info.tsx
|   |   |-- horizontal-location-card.tsx
|   |   |-- lazy-locations-components.tsx
|   |   |-- location-attributes-dialog.tsx
|   |   |-- location-bulk-delete-dialog.tsx
|   |   |-- location-card-skeleton.tsx
|   |   |-- location-card-v2.tsx
|   |   |-- location-card.tsx
|   |   |-- location-detail-header.tsx
|   |   |-- location-filters-panel.tsx
|   |   |-- location-filters.tsx
|   |   |-- location-form-dialog.tsx
|   |   |-- location-media-section.tsx
|   |   |-- location-metrics-section.tsx
|   |   |-- location-overview-section.tsx
|   |   |-- location-performance-widget.tsx
|   |   |-- location-profile-enhanced.tsx
|   |   |-- location-qa-section.tsx
|   |   |-- location-reviews-section.tsx
|   |   |-- location-types.tsx
|   |   |-- locations-analytics-tab.tsx
|   |   |-- locations-error-alert.tsx
|   |   |-- locations-error-boundary.tsx
|   |   |-- locations-filters.tsx
|   |   |-- locations-list-view.tsx
|   |   |-- locations-list.tsx
|   |   |-- locations-map-tab-new.tsx
|   |   |-- locations-map-tab.tsx
|   |   |-- locations-map-view.tsx
|   |   |-- locations-overview-tab.tsx
|   |   |-- locations-stats-cards-api.tsx
|   |   |-- locations-stats-cards.tsx
|   |   |-- locations-stats.tsx
|   |   |-- map-view.tsx
|   |   |-- responsive-locations-layout.tsx
|   |   `-- search-google-locations-dialog.tsx
|   |-- media
|   |   `-- media-gallery.tsx
|   |-- questions
|   |   |-- QuestionAnswerCockpit.tsx
|   |   `-- questions-list.tsx
|   |-- recommendations
|   |   `-- business-recommendations.tsx
|   |-- reviews
|   |   |-- ai-cockpit
|   |   |   |-- ai-copilot-status.tsx
|   |   |   |-- empty-state.tsx
|   |   |   |-- hot-topics-list.tsx
|   |   |   |-- pending-responses-card.tsx
|   |   |   |-- review-card.tsx
|   |   |   |-- review-stream-list.tsx
|   |   |   |-- sentiment-analysis-card.tsx
|   |   |   `-- sentiment-breakdown.tsx
|   |   |-- ReviewResponseCockpit.tsx
|   |   |-- ai-assistant-panel.tsx
|   |   |-- auto-reply-settings.tsx
|   |   |-- reply-dialog.tsx
|   |   |-- review-card.tsx
|   |   |-- review-column.tsx
|   |   |-- review-filters.tsx
|   |   |-- reviews-feed.tsx
|   |   |-- reviews-list.tsx
|   |   |-- selected-review-detail.tsx
|   |   `-- stats-cards.tsx
|   |-- settings
|   |   `-- gmb-settings.tsx
|   |-- ui
|   |   |-- LanguageSwitcher.tsx
|   |   |-- Loader.tsx
|   |   |-- alert.tsx
|   |   |-- avatar.tsx
|   |   |-- badge.tsx
|   |   |-- button.tsx
|   |   |-- card.tsx
|   |   |-- checkbox.tsx
|   |   |-- command.tsx
|   |   |-- dialog.tsx
|   |   |-- dropdown-menu.tsx
|   |   |-- input.tsx
|   |   |-- label.tsx
|   |   |-- loading-skeleton.tsx
|   |   |-- popover.tsx
|   |   |-- progress.tsx
|   |   |-- scroll-area.tsx
|   |   |-- select.tsx
|   |   |-- separator.tsx
|   |   |-- sheet.tsx
|   |   |-- skeleton.tsx
|   |   |-- switch.tsx
|   |   |-- tabs.tsx
|   |   |-- textarea.tsx
|   |   |-- theme-toggle.tsx
|   |   |-- toast.tsx
|   |   `-- tooltip.tsx
|   |-- error-boundary.tsx
|   `-- theme-provider.tsx
|-- hooks
|   |-- use-ai-response-generator.ts
|   |-- use-dashboard-cache.ts
|   |-- use-google-maps.ts
|   |-- use-keyboard-shortcuts.ts
|   |-- use-location-map-data.ts
|   |-- use-locations-cache.ts
|   |-- use-locations.ts
|   |-- use-pending-reviews.ts
|   |-- use-sentiment-analysis.ts
|   `-- use-toast.ts
|-- lib
|   |-- api
|   |   `-- auth-middleware.ts
|   |-- gmb
|   |   `-- helpers.ts
|   |-- hooks
|   |   |-- use-dashboard-realtime.ts
|   |   |-- use-keyboard-shortcut.ts
|   |   |-- use-supabase.ts
|   |   |-- useAccountsManagement.ts
|   |   `-- useOAuthCallbackHandler.ts
|   |-- posts
|   |   `-- posts-crud.ts
|   |-- services
|   |   |-- activity.ts
|   |   |-- ai-review-service.ts
|   |   |-- auth-service.ts
|   |   |-- email-client.ts
|   |   |-- email-service.ts
|   |   `-- sendgrid-service.ts
|   |-- supabase
|   |   |-- client.ts
|   |   |-- middleware.ts
|   |   `-- server.ts
|   |-- types
|   |   `-- database.ts
|   |-- utils
|   |   |-- api-error-handler.ts
|   |   |-- api-response.ts
|   |   |-- auth-helpers.ts
|   |   |-- debounce.ts
|   |   |-- get-base-url-client.ts
|   |   |-- get-base-url-dynamic.ts
|   |   |-- get-base-url.ts
|   |   |-- location-coordinates.ts
|   |   |-- performance-calculations.ts
|   |   `-- sanitize.ts
|   |-- validations
|   |   |-- auth.ts
|   |   |-- dashboard.ts
|   |   `-- gmb-post.ts
|   |-- Google\ Business\ Profile\ API.json
|   |-- navigation.ts
|   |-- rate-limit.ts
|   `-- utils.ts
|-- messages
|   |-- ar.json
|   |   `-- en.json
|-- public
|   |-- locales
|   |   |-- ar
|   |   |   `-- common.json
|   |   `-- en
|   |       `-- common.json
|   |-- apple-touch-icon.png
|   |-- favicon-16x16.png
|   |-- favicon-32x32.png
|   |-- favicon.ico
|   |-- favicon.png
|   |-- manifest.json
|   |-- modern-dark-dashboard-interface-with-charts-and-an.jpg
|   |-- nnh-logo.png
|   |-- placeholder-logo.png
|   |-- placeholder-logo.svg
|   |-- placeholder-user.jpg
|   |-- placeholder.jpg
|   `-- placeholder.svg
|-- scripts
|   |-- 001_create_gmb_schema.sql
|   |-- 002_create_profile_trigger.sql
|   |-- fix_gmb_locations_columns.js
|   |-- inspect_db_structure.js
|   |-- inspect_supabase_tables.sh
|   |-- run_gmb_audit.sh
|   |-- run_single_audit.sh
|   |-- show_all_tables.js
|   |-- test_attributes_api.js
|   |-- test_google_api.sh
|   |-- test_media_api.sh
|   `-- test_qa_api.sh
|-- server
|   |-- actions
|   |   |-- accounts.ts
|   |   |-- achievements.ts
|   |   |-- auth.ts
|   |   |-- dashboard.ts
|   |   |-- index.ts
|   |   |-- locations.ts
|   |   |-- onboarding.ts
|   |   |-- performance.ts
|   |   `-- reviews.ts
|   `-- services
|       `-- activity.ts
|-- sql
|   |-- check_and_fix_duplicates.sql
|   |-- check_final_status.sql
|   |-- check_gmb_posts_state.sql
|   |-- complete_schema_sync.sql
|   |-- comprehensive_database_queries.sql
|   |-- create_missing_tables.sql
|   |-- database_audit.sql
|   |-- debug_duplicate_display.sql
|   |-- delete_duplicate_locations.sql
|   |-- diagnose_all_issues.sql
|   |-- fix_all_schema_issues.sql
|   |-- fix_duplicate_locations.sql
|   |-- fix_duplicate_locations_smart.sql
|   |-- fix_gmb_locations_missing_columns.sql
|   |-- fix_metadata_default.sql
|   |-- fix_migration_issue.sql
|   |-- gmb_audit_summary_report.sql
|   |-- gmb_critical_issues_analysis.sql
|   |-- gmb_data_audit_logic_checks.sql
|   |-- gmb_quick_audit.sql
|   |-- inspect_all_tables.sql
|   |-- quick_cron_test.sql
|   |-- quick_final_check.sql
|   |-- remove_duplicate_migration.sql
|   |-- safe_fix_gmb_posts.sql
|   |-- setup_supabase_cron.sql
|   |-- test_connection.sql
|   |-- test_cron_jobs.sql
|   |-- update_trigger_function.sql
|   |-- verify_schema_completeness.sql
|   `-- verify_schema_status.sql
|-- styles
|   `-- globals.css
|-- supabase
|   |-- .temp
|   |   |-- cli-latest
|   |   |-- gotrue-version
|   |   |-- pooler-url
|   |   |-- postgres-version
|   |   |-- project-ref
|   |   |-- rest-version
|   |   |-- storage-migration
|   |   `-- storage-version
|   |-- functions
|   |   `-- scheduled-sync
|   |       `-- index.ts
|   |-- migrations
|   |   |-- 20250102_gmb_posts_metadata.sql
|   |   |-- 20250102_notifications.sql
|   |   |-- 20250102_youtube_tables.sql
|   |   |-- 20250105000000_create_missing_tables_from_json.sql
|   |   |-- 20250105000001_fix_foreign_keys_and_constraints.sql
|   |   |-- 20250106_fix_gmb_posts_columns.sql
|   |   |-- 20250127_add_critical_dashboard_indexes.sql
|   |   |-- 20250127_add_dashboard_indexes.sql
|   |   |-- 20250127_enable_realtime_replication.sql
|   |   |-- 20250131_add_email_to_gmb_accounts.sql
|   |   |-- 20250131_add_missing_columns.sql
|   |   |-- 20250131_add_phone_to_profiles.sql
|   |   |-- 20250131_content_generations.sql
|   |   |-- 20250131_create_youtube_videos_table.sql
|   |   |-- 20250131_fix_database_issues.sql
|   |   |-- 20250131_fix_gmb_reviews_columns.sql
|   |   |-- 20250131_fix_phone_signup_profile.sql
|   |   |-- 20250131_fix_rls_profile_insert.sql
|   |   |-- 20250201_add_rating_to_gmb_locations.sql
|   |   |-- 20250202_create_gmb_media_table.sql
|   |   |-- 20250202_create_gmb_performance_metrics_table.sql
|   |   |-- 20250202_fix_oauth_states_user_id_fk.sql
|   |   |-- 20250203_create_gmb_attributes_table.sql
|   |   |-- 20250203_create_gmb_questions_table.sql
|   |   |-- 20250204_ai_review_cockpit.sql
|   |   |-- 20251029_add_user_id_columns.sql
|   |   |-- 20251029_create_oauth_tables.sql
|   |   |-- 20251029_enable_rls_gmb_accounts.sql
|   |   |-- 20251029_enable_rls_policies.sql
|   |   |-- 20251030000013_create_locations_with_rating_view.sql
|   |   |-- 20251031_gmb_posts.sql
|   |   |-- 20251031_storage_buckets.sql
|   |   |-- 20251102_fix_production_security_issues.sql
|   |   |-- 20251104120000_fix_weekly_task_recommendations.sql
|   |   `-- 20251104_add_email_to_gmb_accounts.sql
|   `-- config.toml
|-- supabase-email-templates
|   |-- change-email.html
|   |-- confirm-signup.html
|   |-- invite-user.html
|   |-- magic-link.html
|   |-- reauthentication.html
|   `-- reset-password.html
|-- utils
|   `-- map-styles.ts
|-- .gitignore
|-- .replit
|-- .replit.trigger
|-- CODE_STRUCTURE_INSTRUCTIONS.md
|-- PROJECT_STRUCTURE.md
|-- components.json
|-- eslint.config.mjs
|-- generated-icon.png
|-- i18n.ts
|-- middleware.ts
|-- next-env.d.ts
|-- next.config.mjs
|-- package-lock.json
|-- package.json
|-- pnpm-lock.yaml
|-- postcss.config.mjs
|-- tables_columns_structure.json
|-- tsconfig.json
`-- vercel.json

162 directories, 390 files
```

---

## 📊 Project Statistics

- **Total Directories:** 162
- **Total Files:** 390
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui

---

## 🗂️ Key Directories

### `/app`
Next.js App Router structure with:
- **`[locale]`** - Internationalized routes (English/Arabic)
- **`(dashboard)`** - Protected dashboard routes
- **`(auth)`** - Authentication routes
- **`api`** - API route handlers

### `/components`
React components organized by feature:
- **`ui/`** - Reusable UI components (shadcn/ui)
- **`dashboard/`** - Dashboard-specific components
- **`locations/`** - Location management components
- **`reviews/`** - Review management components
- **`questions/`** - Q&A management components

### `/lib`
Shared utilities and services:
- **`supabase/`** - Supabase client configuration
- **`services/`** - Business logic services
- **`utils/`** - Helper functions
- **`types/`** - TypeScript type definitions

### `/supabase`
Database configuration:
- **`migrations/`** - Database migration files
- **`functions/`** - Edge functions
- **`config.toml`** - Supabase configuration

---

## 🔍 Recent Additions

### Dashboard
- `app/[locale]/(dashboard)/dashboard/page.tsx` - AI Command Center
- `app/[locale]/(dashboard)/dashboard/DashboardClient.tsx` - Interactive components
- `app/[locale]/(dashboard)/dashboard/PerformanceChart.tsx` - Real-time charts
- `app/[locale]/(dashboard)/dashboard/actions.ts` - Server actions

### Questions & Answers
- `app/[locale]/(dashboard)/questions/page.tsx` - Main Q&A page
- `app/[locale]/(dashboard)/questions/QuestionsClient.tsx` - Client components
- `app/[locale]/(dashboard)/questions/loading.tsx` - Loading state
- `app/[locale]/(dashboard)/questions/error.tsx` - Error boundary

---

## 📝 Notes

- This structure excludes `node_modules`, `.next`, and `.git` directories
- All routes support internationalization (i18n) via `[locale]` parameter
- API routes follow RESTful conventions
- Components are organized by feature domain
- Database migrations are versioned with timestamps

---

**Last Updated:** 2025-11-06 22:14:53
