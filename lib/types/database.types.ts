export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          actionable: boolean | null
          activity_message: string
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          actionable?: boolean | null
          activity_message: string
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          actionable?: boolean | null
          activity_message?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_requests: {
        Row: {
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string | null
          feature: string
          id: string
          latency_ms: number | null
          location_id: string | null
          model: string
          prompt_tokens: number | null
          provider: string
          success: boolean | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          feature: string
          id?: string
          latency_ms?: number | null
          location_id?: string | null
          model: string
          prompt_tokens?: number | null
          provider: string
          success?: boolean | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          feature?: string
          id?: string
          latency_ms?: number | null
          location_id?: string | null
          model?: string
          prompt_tokens?: number | null
          provider?: string
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_profile_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          id: string
          location_id: string
          location_name: string
          metadata: Json | null
          operation_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: Json
          id?: string
          location_id: string
          location_name: string
          metadata?: Json | null
          operation_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          location_id?: string
          location_name?: string
          metadata?: Json | null
          operation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profile_history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profile_history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profile_history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          context: Json | null
          created_at: string | null
          device_type: string | null
          error_code: string | null
          error_type: string | null
          id: string
          ip_address: unknown
          level: string | null
          message: string
          os_name: string | null
          os_version: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          severity: number | null
          stack: string | null
          timestamp: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          context?: Json | null
          created_at?: string | null
          device_type?: string | null
          error_code?: string | null
          error_type?: string | null
          id?: string
          ip_address?: unknown
          level?: string | null
          message: string
          os_name?: string | null
          os_version?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: number | null
          stack?: string | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          context?: Json | null
          created_at?: string | null
          device_type?: string | null
          error_code?: string | null
          error_type?: string | null
          id?: string
          ip_address?: unknown
          level?: string | null
          message?: string
          os_name?: string | null
          os_version?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: number | null
          stack?: string | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gmb_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          data_retention_days: number | null
          delete_on_disconnect: boolean | null
          disconnected_at: string | null
          email: string | null
          google_account_id: string | null
          id: string
          is_active: boolean | null
          last_sync: string | null
          refresh_token: string | null
          settings: Json | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          data_retention_days?: number | null
          delete_on_disconnect?: boolean | null
          disconnected_at?: string | null
          email?: string | null
          google_account_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          data_retention_days?: number | null
          delete_on_disconnect?: boolean | null
          disconnected_at?: string | null
          email?: string | null
          google_account_id?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_locations: {
        Row: {
          account_id: string | null
          additional_categories: string[] | null
          address: string | null
          ai_insights: string | null
          appointment_url: string | null
          archived_at: string | null
          booking_url: string | null
          business_hours: Json | null
          calculated_response_rate: number | null
          category: string | null
          cover_photo_url: string | null
          created_at: string | null
          description: string | null
          from_the_business: string[] | null
          gmb_account_id: string
          health_score: number | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          is_syncing: boolean | null
          last_synced_at: string | null
          latitude: number | null
          latlng: string | null
          location_id: string
          location_id_external: string | null
          location_name: string
          longitude: number | null
          menu_url: string | null
          metadata: Json | null
          normalized_location_id: string | null
          opening_date: string | null
          order_url: string | null
          phone: string | null
          profile_completeness: number | null
          rating: number | null
          regularhours: Json | null
          response_rate: number | null
          review_count: number | null
          service_area_enabled: boolean | null
          short_description: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          account_id?: string | null
          additional_categories?: string[] | null
          address?: string | null
          ai_insights?: string | null
          appointment_url?: string | null
          archived_at?: string | null
          booking_url?: string | null
          business_hours?: Json | null
          calculated_response_rate?: number | null
          category?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          from_the_business?: string[] | null
          gmb_account_id: string
          health_score?: number | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_syncing?: boolean | null
          last_synced_at?: string | null
          latitude?: number | null
          latlng?: string | null
          location_id: string
          location_id_external?: string | null
          location_name: string
          longitude?: number | null
          menu_url?: string | null
          metadata?: Json | null
          normalized_location_id?: string | null
          opening_date?: string | null
          order_url?: string | null
          phone?: string | null
          profile_completeness?: number | null
          rating?: number | null
          regularhours?: Json | null
          response_rate?: number | null
          review_count?: number | null
          service_area_enabled?: boolean | null
          short_description?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          account_id?: string | null
          additional_categories?: string[] | null
          address?: string | null
          ai_insights?: string | null
          appointment_url?: string | null
          archived_at?: string | null
          booking_url?: string | null
          business_hours?: Json | null
          calculated_response_rate?: number | null
          category?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          from_the_business?: string[] | null
          gmb_account_id?: string
          health_score?: number | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_syncing?: boolean | null
          last_synced_at?: string | null
          latitude?: number | null
          latlng?: string | null
          location_id?: string
          location_id_external?: string | null
          location_name?: string
          longitude?: number | null
          menu_url?: string | null
          metadata?: Json | null
          normalized_location_id?: string | null
          opening_date?: string | null
          order_url?: string | null
          phone?: string | null
          profile_completeness?: number | null
          rating?: number | null
          regularhours?: Json | null
          response_rate?: number | null
          review_count?: number | null
          service_area_enabled?: boolean | null
          short_description?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmb_locations_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_media: {
        Row: {
          created_at: string | null
          external_media_id: string
          gmb_account_id: string
          id: string
          location_id: string
          metadata: Json | null
          synced_at: string | null
          thumbnail_url: string | null
          type: string | null
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          external_media_id: string
          gmb_account_id: string
          id?: string
          location_id: string
          metadata?: Json | null
          synced_at?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          external_media_id?: string
          gmb_account_id?: string
          id?: string
          location_id?: string
          metadata?: Json | null
          synced_at?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_media_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_media_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_media_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_media_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_metrics: {
        Row: {
          avg_duration_ms: number | null
          created_at: string
          gmb_account_id: string
          id: string
          phase: string
          runs_count: number
          total_duration_ms: number
          total_items_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_duration_ms?: number | null
          created_at?: string
          gmb_account_id: string
          id?: string
          phase: string
          runs_count?: number
          total_duration_ms?: number
          total_items_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_duration_ms?: number | null
          created_at?: string
          gmb_account_id?: string
          id?: string
          phase?: string
          runs_count?: number
          total_duration_ms?: number
          total_items_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gmb_performance_metrics: {
        Row: {
          created_at: string | null
          gmb_account_id: string
          id: string
          location_id: string
          metadata: Json | null
          metric_date: string
          metric_type: string
          metric_value: number
          sub_entity_type: Json | null
          synced_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gmb_account_id: string
          id?: string
          location_id: string
          metadata?: Json | null
          metric_date: string
          metric_type: string
          metric_value?: number
          sub_entity_type?: Json | null
          synced_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gmb_account_id?: string
          id?: string
          location_id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type?: string
          metric_value?: number
          sub_entity_type?: Json | null
          synced_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_performance_metrics_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_performance_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_performance_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_performance_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_posts: {
        Row: {
          archived_at: string | null
          call_to_action: string | null
          call_to_action_url: string | null
          content: string
          created_at: string | null
          cta_type: string | null
          cta_url: string | null
          end_date: string | null
          error_message: string | null
          id: string
          is_archived: boolean | null
          location_id: string
          media_url: string | null
          metadata: Json | null
          post_id: string | null
          post_type: string | null
          provider_post_id: string | null
          published_at: string | null
          scheduled_at: string | null
          start_date: string | null
          status: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          call_to_action?: string | null
          call_to_action_url?: string | null
          content: string
          created_at?: string | null
          cta_type?: string | null
          cta_url?: string | null
          end_date?: string | null
          error_message?: string | null
          id?: string
          is_archived?: boolean | null
          location_id: string
          media_url?: string | null
          metadata?: Json | null
          post_id?: string | null
          post_type?: string | null
          provider_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          call_to_action?: string | null
          call_to_action_url?: string | null
          content?: string
          created_at?: string | null
          cta_type?: string | null
          cta_url?: string | null
          end_date?: string | null
          error_message?: string | null
          id?: string
          is_archived?: boolean | null
          location_id?: string
          media_url?: string | null
          metadata?: Json | null
          post_id?: string | null
          post_type?: string | null
          provider_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_questions: {
        Row: {
          ai_answer_generated: boolean | null
          ai_category: string | null
          ai_confidence_score: number | null
          ai_suggested_answer: string | null
          answer_id: string | null
          answer_status: string | null
          answer_text: string | null
          answered_at: string | null
          answered_by: string | null
          archived_at: string | null
          asked_at: string | null
          author_display_name: string | null
          author_name: string | null
          author_profile_photo_url: string | null
          author_type: string | null
          created_at: string | null
          external_question_id: string | null
          gmb_account_id: string
          google_resource_name: string | null
          id: string
          internal_notes: string | null
          is_archived: boolean | null
          is_featured: boolean | null
          is_hidden: boolean | null
          language_code: string | null
          location_id: string
          metadata: Json | null
          priority: string | null
          question_id: string | null
          question_text: string
          question_url: string | null
          status: string | null
          synced_at: string | null
          total_answer_count: number | null
          updated_at: string | null
          upvote_count: number | null
          user_id: string
        }
        Insert: {
          ai_answer_generated?: boolean | null
          ai_category?: string | null
          ai_confidence_score?: number | null
          ai_suggested_answer?: string | null
          answer_id?: string | null
          answer_status?: string | null
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          archived_at?: string | null
          asked_at?: string | null
          author_display_name?: string | null
          author_name?: string | null
          author_profile_photo_url?: string | null
          author_type?: string | null
          created_at?: string | null
          external_question_id?: string | null
          gmb_account_id: string
          google_resource_name?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean | null
          is_featured?: boolean | null
          is_hidden?: boolean | null
          language_code?: string | null
          location_id: string
          metadata?: Json | null
          priority?: string | null
          question_id?: string | null
          question_text: string
          question_url?: string | null
          status?: string | null
          synced_at?: string | null
          total_answer_count?: number | null
          updated_at?: string | null
          upvote_count?: number | null
          user_id: string
        }
        Update: {
          ai_answer_generated?: boolean | null
          ai_category?: string | null
          ai_confidence_score?: number | null
          ai_suggested_answer?: string | null
          answer_id?: string | null
          answer_status?: string | null
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          archived_at?: string | null
          asked_at?: string | null
          author_display_name?: string | null
          author_name?: string | null
          author_profile_photo_url?: string | null
          author_type?: string | null
          created_at?: string | null
          external_question_id?: string | null
          gmb_account_id?: string
          google_resource_name?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean | null
          is_featured?: boolean | null
          is_hidden?: boolean | null
          language_code?: string | null
          location_id?: string
          metadata?: Json | null
          priority?: string | null
          question_id?: string | null
          question_text?: string
          question_url?: string | null
          status?: string | null
          synced_at?: string | null
          total_answer_count?: number | null
          updated_at?: string | null
          upvote_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_questions_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_questions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_questions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_questions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_reviews: {
        Row: {
          account_id: string | null
          ai_confidence_score: number | null
          ai_generated_at: string | null
          ai_generated_response: string | null
          ai_reply_generated: boolean | null
          ai_sent_at: string | null
          ai_sentiment: string | null
          ai_sentiment_analysis: Json | null
          ai_sentiment_score: number | null
          ai_suggested_reply: string | null
          archived_at: string | null
          auto_reply_enabled: boolean | null
          auto_reply_status: string | null
          comment: string | null
          created_at: string | null
          external_review_id: string | null
          flagged_reason: string | null
          gmb_account_id: string | null
          google_my_business_name: string | null
          has_reply: boolean | null
          has_response: boolean | null
          id: string
          internal_notes: string | null
          is_anonymized: boolean | null
          is_archived: boolean | null
          is_verified_purchase: boolean | null
          location_id: string
          metadata: Json | null
          rating: number
          replied_at: string | null
          reply_date: string | null
          reply_text: string | null
          reply_timestamp: string | null
          responded_at: string | null
          response: string | null
          response_priority: string | null
          response_text: string | null
          review_date: string | null
          review_id: string | null
          review_reply: string | null
          review_text: string | null
          review_timestamp: string | null
          review_url: string | null
          reviewer_display_name: string | null
          reviewer_name: string | null
          reviewer_profile_photo_url: string | null
          status: string | null
          synced_at: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          ai_confidence_score?: number | null
          ai_generated_at?: string | null
          ai_generated_response?: string | null
          ai_reply_generated?: boolean | null
          ai_sent_at?: string | null
          ai_sentiment?: string | null
          ai_sentiment_analysis?: Json | null
          ai_sentiment_score?: number | null
          ai_suggested_reply?: string | null
          archived_at?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_status?: string | null
          comment?: string | null
          created_at?: string | null
          external_review_id?: string | null
          flagged_reason?: string | null
          gmb_account_id?: string | null
          google_my_business_name?: string | null
          has_reply?: boolean | null
          has_response?: boolean | null
          id?: string
          internal_notes?: string | null
          is_anonymized?: boolean | null
          is_archived?: boolean | null
          is_verified_purchase?: boolean | null
          location_id: string
          metadata?: Json | null
          rating: number
          replied_at?: string | null
          reply_date?: string | null
          reply_text?: string | null
          reply_timestamp?: string | null
          responded_at?: string | null
          response?: string | null
          response_priority?: string | null
          response_text?: string | null
          review_date?: string | null
          review_id?: string | null
          review_reply?: string | null
          review_text?: string | null
          review_timestamp?: string | null
          review_url?: string | null
          reviewer_display_name?: string | null
          reviewer_name?: string | null
          reviewer_profile_photo_url?: string | null
          status?: string | null
          synced_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          ai_confidence_score?: number | null
          ai_generated_at?: string | null
          ai_generated_response?: string | null
          ai_reply_generated?: boolean | null
          ai_sent_at?: string | null
          ai_sentiment?: string | null
          ai_sentiment_analysis?: Json | null
          ai_sentiment_score?: number | null
          ai_suggested_reply?: string | null
          archived_at?: string | null
          auto_reply_enabled?: boolean | null
          auto_reply_status?: string | null
          comment?: string | null
          created_at?: string | null
          external_review_id?: string | null
          flagged_reason?: string | null
          gmb_account_id?: string | null
          google_my_business_name?: string | null
          has_reply?: boolean | null
          has_response?: boolean | null
          id?: string
          internal_notes?: string | null
          is_anonymized?: boolean | null
          is_archived?: boolean | null
          is_verified_purchase?: boolean | null
          location_id?: string
          metadata?: Json | null
          rating?: number
          replied_at?: string | null
          reply_date?: string | null
          reply_text?: string | null
          reply_timestamp?: string | null
          responded_at?: string | null
          response?: string | null
          response_priority?: string | null
          response_text?: string | null
          review_date?: string | null
          review_id?: string | null
          review_reply?: string | null
          review_text?: string | null
          review_timestamp?: string | null
          review_url?: string | null
          reviewer_display_name?: string | null
          reviewer_name?: string | null
          reviewer_profile_photo_url?: string | null
          status?: string | null
          synced_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmb_reviews_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_search_keywords: {
        Row: {
          created_at: string | null
          gmb_account_id: string
          id: string
          impressions_count: number
          location_id: string
          metadata: Json | null
          month_year: string
          search_keyword: string
          synced_at: string | null
          threshold_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gmb_account_id: string
          id?: string
          impressions_count?: number
          location_id: string
          metadata?: Json | null
          month_year: string
          search_keyword: string
          synced_at?: string | null
          threshold_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gmb_account_id?: string
          id?: string
          impressions_count?: number
          location_id?: string
          metadata?: Json | null
          month_year?: string
          search_keyword?: string
          synced_at?: string | null
          threshold_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_search_keywords_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_search_keywords_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_search_keywords_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "gmb_locations_with_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_search_keywords_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_sync_logs: {
        Row: {
          counts: Json | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          error: string | null
          gmb_account_id: string
          id: string
          metadata: Json | null
          phase: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          counts?: Json | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          error?: string | null
          gmb_account_id: string
          id?: string
          metadata?: Json | null
          phase: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          counts?: Json | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          error?: string | null
          gmb_account_id?: string
          id?: string
          metadata?: Json | null
          phase?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_sync_logs_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmb_sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          state: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          state: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          state?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          id: string
          metadata: Json | null
          name: string
          timestamp: string
          unit: string
          user_id: string | null
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json | null
          name: string
          timestamp?: string
          unit: string
          user_id?: string | null
          value: number
        }
        Update: {
          id?: string
          metadata?: Json | null
          name?: string
          timestamp?: string
          unit?: string
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login: string | null
          phone: string | null
          provider_sub: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          provider_sub?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          provider_sub?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_requests: {
        Row: {
          action: string
          created_at: string
          endpoint: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          endpoint?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          endpoint?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_task_recommendations: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          effort_level: string | null
          estimated_minutes: number | null
          expected_impact: string | null
          id: string
          insights: string | null
          priority: string | null
          reasoning: string | null
          status: string | null
          tasks: Json | null
          title: string
          updated_at: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          effort_level?: string | null
          estimated_minutes?: number | null
          expected_impact?: string | null
          id?: string
          insights?: string | null
          priority?: string | null
          reasoning?: string | null
          status?: string | null
          tasks?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          effort_level?: string | null
          estimated_minutes?: number | null
          expected_impact?: string | null
          id?: string
          insights?: string | null
          priority?: string | null
          reasoning?: string | null
          status?: string | null
          tasks?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      gmb_locations_with_rating: {
        Row: {
          address: string | null
          business_hours: Json | null
          calculated_rating: number | null
          category: string | null
          created_at: string | null
          gmb_account_id: string | null
          id: string | null
          is_active: boolean | null
          last_review_date: string | null
          location_id: string | null
          location_name: string | null
          metadata: Json | null
          normalized_location_id: string | null
          phone: string | null
          reviews_count: number | null
          stored_rating: number | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmb_locations_gmb_account_id_fkey"
            columns: ["gmb_account_id"]
            isOneToOne: false
            referencedRelation: "gmb_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_location_stats: {
        Row: {
          answered_questions: number | null
          avg_rating: number | null
          id: string | null
          last_question_date: string | null
          last_review_date: string | null
          location_name: string | null
          replied_reviews: number | null
          total_questions: number | null
          total_reviews: number | null
          user_id: string | null
        }
        Relationships: []
      }
      review_stats_view: {
        Row: {
          avg_rating: number | null
          negative_count: number | null
          neutral_count: number | null
          pending_reviews: number | null
          positive_count: number | null
          responded_reviews: number | null
          response_rate: number | null
          total_reviews: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_dashboard_stats: {
        Row: {
          avg_rating: number | null
          calculated_at: string | null
          pending_questions: number | null
          pending_reviews: number | null
          recent_questions: number | null
          recent_reviews: number | null
          response_rate: number | null
          total_locations: number | null
          total_reviews: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_error_summary: {
        Row: {
          error_count: number | null
          last_error: string | null
          resolved_count: number | null
          severity: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_notification_summary: {
        Row: {
          last_notification: string | null
          total_count: number | null
          type: string | null
          unread_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_performance_summary: {
        Row: {
          avg_value: number | null
          last_measured: string | null
          max_value: number | null
          measurement_count: number | null
          median_value: number | null
          min_value: number | null
          name: string | null
          p95_value: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_location_health_score: {
        Args: { p_location_id: string }
        Returns: number
      }
      calculate_location_response_rate: {
        Args: { p_location_id: string }
        Returns: number
      }
      calculate_user_response_rate: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_weighted_response_rate: {
        Args: { location_ids: string[] }
        Returns: number
      }
      clean_old_error_logs: { Args: never; Returns: undefined }
      cleanup_error_logs: { Args: never; Returns: undefined }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      cleanup_old_activities: { Args: never; Returns: undefined }
      cleanup_performance_metrics: { Args: never; Returns: undefined }
      cleanup_rate_limit_requests: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_oauth_state: {
        Args: { p_ttl_seconds?: number; p_user_id: string }
        Returns: string
      }
      decrypt_token: { Args: { encrypted: string }; Returns: string }
      delete_all_users: { Args: never; Returns: undefined }
      encrypt_token: { Args: { plaintext: string }; Returns: string }
      extract_sentiment_topics: { Args: { analysis: Json }; Returns: string[] }
      get_aspect_score: {
        Args: { analysis: Json; aspect: string }
        Returns: number
      }
      get_dashboard_trends: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          change_percentage: number
          change_value: number
          current_value: number
          metric_name: string
          previous_value: number
        }[]
      }
      get_decrypted_tokens: {
        Args: { p_id: string }
        Returns: {
          access_token: string
          expires_at: string
          refresh_token: string
        }[]
      }
      get_location_trends: {
        Args: { p_days?: number; p_location_id: string }
        Returns: {
          change_percentage: number
          change_value: number
          current_value: number
          metric_name: string
          previous_value: number
        }[]
      }
      get_profile_history_with_diff: {
        Args: { p_location_id: string }
        Returns: {
          changes: Json
          created_at: string
          created_by: string
          current_values: Json
          id: string
          operation_type: string
          previous_values: Json
        }[]
      }
      get_review_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_rating: number
          negative_count: number
          neutral_count: number
          pending_reviews: number
          positive_count: number
          responded_reviews: number
          response_rate: number
          total_reviews: number
        }[]
      }
      get_unread_notifications_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      join_room: { Args: { p_room_id: string }; Returns: undefined }
      jsonb_diff: { Args: { new_val: Json; old_val: Json }; Returns: Json }
      leave_room: { Args: { p_room_id: string }; Returns: undefined }
      log_error: {
        Args: {
          p_context?: Json
          p_message: string
          p_severity?: number
          p_stack?: string
          p_user_id: string
        }
        Returns: string
      }
      normalize_location_id: {
        Args: { location_id_text: string }
        Returns: string
      }
      rollback_profile_to_history: {
        Args: { p_history_id: string; p_user_id: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      track_performance: {
        Args: {
          p_metadata?: Json
          p_name: string
          p_user_id: string
          p_value: number
        }
        Returns: string
      }
      trigger_gmb_sync: { Args: never; Returns: undefined }
      update_oauth_tokens_by_id: {
        Args: {
          p_access_token: string
          p_expires_at: string
          p_id: string
          p_refresh_token: string
        }
        Returns: undefined
      }
      upsert_oauth_tokens: {
        Args: {
          p_access_token: string
          p_account_id: string
          p_expires_at: string
          p_provider: string
          p_refresh_token: string
          p_scope: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
