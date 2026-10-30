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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      drafts: {
        Row: {
          created_at: string
          draft_type: string
          event_id: string | null
          id: string
          last_error: string | null
          owner_id: string
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_type: string
          event_id?: string | null
          id?: string
          last_error?: string | null
          owner_id: string
          payload: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_type?: string
          event_id?: string | null
          id?: string
          last_error?: string | null
          owner_id?: string
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          ends_on: string | null
          id: string
          name: string
          slug: string | null
          starts_on: string | null
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          name: string
          slug?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          slug?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_images: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          display_order: number
          event_id: string
          file_size_bytes: number | null
          height: number | null
          id: string
          image_role: string
          is_primary: boolean
          mime_type: string | null
          public_url: string | null
          storage_path: string
          style_id: string | null
          variant_id: string | null
          vendor_id: string
          was_source_info_image: boolean
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by: string
          display_order?: number
          event_id: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_role?: string
          is_primary?: boolean
          mime_type?: string | null
          public_url?: string | null
          storage_path: string
          style_id?: string | null
          variant_id?: string | null
          vendor_id: string
          was_source_info_image?: boolean
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          display_order?: number
          event_id?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_role?: string
          is_primary?: boolean
          mime_type?: string | null
          public_url?: string | null
          storage_path?: string
          style_id?: string | null
          variant_id?: string | null
          vendor_id?: string
          was_source_info_image?: boolean
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fabric_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_images_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "fabric_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "fabric_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_images_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_styles: {
        Row: {
          category: string | null
          composition: string | null
          construction: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          event_id: string
          extracted_at: string | null
          extraction_confidence: number | null
          extraction_status: string | null
          extraction_warnings: Json
          finish: string | null
          id: string
          is_shortlisted: boolean
          item_code: string
          metadata: Json
          name: string | null
          pattern: string | null
          season: string | null
          source: string
          source_info_image_id: string | null
          status: string
          supplier_ref: string | null
          updated_at: string
          updated_by: string | null
          vendor_id: string
          version: number
          weight_gsm: number | null
          weight_ozsy: number | null
          width_cm: number | null
          width_in: number | null
        }
        Insert: {
          category?: string | null
          composition?: string | null
          construction?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          event_id: string
          extracted_at?: string | null
          extraction_confidence?: number | null
          extraction_status?: string | null
          extraction_warnings?: Json
          finish?: string | null
          id?: string
          is_shortlisted?: boolean
          item_code: string
          metadata?: Json
          name?: string | null
          pattern?: string | null
          season?: string | null
          source?: string
          source_info_image_id?: string | null
          status?: string
          supplier_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_id: string
          version?: number
          weight_gsm?: number | null
          weight_ozsy?: number | null
          width_cm?: number | null
          width_in?: number | null
        }
        Update: {
          category?: string | null
          composition?: string | null
          construction?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          event_id?: string
          extracted_at?: string | null
          extraction_confidence?: number | null
          extraction_status?: string | null
          extraction_warnings?: Json
          finish?: string | null
          id?: string
          is_shortlisted?: boolean
          item_code?: string
          metadata?: Json
          name?: string | null
          pattern?: string | null
          season?: string | null
          source?: string
          source_info_image_id?: string | null
          status?: string
          supplier_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string
          version?: number
          weight_gsm?: number | null
          weight_ozsy?: number | null
          width_cm?: number | null
          width_in?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fabric_styles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_styles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_styles_source_info_image_id_fkey"
            columns: ["source_info_image_id"]
            isOneToOne: false
            referencedRelation: "fabric_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_styles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_styles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_variants: {
        Row: {
          color_code: string | null
          color_name: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          event_id: string
          finish_override: string | null
          id: string
          metadata: Json
          status: string
          style_id: string
          updated_at: string
          updated_by: string | null
          variant_name: string | null
          vendor_id: string
          version: number
          wash_code: string | null
        }
        Insert: {
          color_code?: string | null
          color_name?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          event_id: string
          finish_override?: string | null
          id?: string
          metadata?: Json
          status?: string
          style_id: string
          updated_at?: string
          updated_by?: string | null
          variant_name?: string | null
          vendor_id: string
          version?: number
          wash_code?: string | null
        }
        Update: {
          color_code?: string | null
          color_name?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          event_id?: string
          finish_override?: string | null
          id?: string
          metadata?: Json
          status?: string
          style_id?: string
          updated_at?: string
          updated_by?: string | null
          variant_name?: string | null
          vendor_id?: string
          version?: number
          wash_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fabric_variants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_variants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_variants_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "fabric_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_variants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_variants_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_records: {
        Row: {
          batch_no: string | null
          captured_at: string
          created_at: string
          created_by: string
          event_id: string
          id: string
          quantity: number
          stock_status: string | null
          style_id: string
          unit: string
          updated_at: string
          variant_id: string
          vendor_id: string
        }
        Insert: {
          batch_no?: string | null
          captured_at?: string
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          quantity?: number
          stock_status?: string | null
          style_id: string
          unit: string
          updated_at?: string
          variant_id: string
          vendor_id: string
        }
        Update: {
          batch_no?: string | null
          captured_at?: string
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          quantity?: number
          stock_status?: string | null
          style_id?: string
          unit?: string
          updated_at?: string
          variant_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_records_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "fabric_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_records_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "fabric_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_in_app: boolean
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          created_at: string
          currency: string
          event_id: string
          id: string
          lead_time_unit: string | null
          lead_time_value: number | null
          minimum_order_quantity: number | null
          minimum_order_unit: string | null
          notes: string | null
          price: number
          price_unit: string
          recorded_by: string
          style_id: string | null
          variant_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          lead_time_unit?: string | null
          lead_time_value?: number | null
          minimum_order_quantity?: number | null
          minimum_order_unit?: string | null
          notes?: string | null
          price: number
          price_unit: string
          recorded_by: string
          style_id?: string | null
          variant_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          lead_time_unit?: string | null
          lead_time_value?: number | null
          minimum_order_quantity?: number | null
          minimum_order_unit?: string | null
          notes?: string | null
          price?: number
          price_unit?: string
          recorded_by?: string
          style_id?: string | null
          variant_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "fabric_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "fabric_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scan_sessions: {
        Row: {
          confidence_scores: Json | null
          created_at: string
          created_by: string
          error_message: string | null
          event_id: string
          extraction_status: string
          extractor_model: string | null
          extractor_name: string | null
          extractor_version: string | null
          id: string
          normalized_payload: Json | null
          raw_payload: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_payload: Json | null
          scan_type: string
          source_image_path: string | null
          source_image_url: string | null
          style_id: string | null
          vendor_id: string | null
        }
        Insert: {
          confidence_scores?: Json | null
          created_at?: string
          created_by: string
          error_message?: string | null
          event_id: string
          extraction_status?: string
          extractor_model?: string | null
          extractor_name?: string | null
          extractor_version?: string | null
          id?: string
          normalized_payload?: Json | null
          raw_payload?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_payload?: Json | null
          scan_type: string
          source_image_path?: string | null
          source_image_url?: string | null
          style_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          confidence_scores?: Json | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          event_id?: string
          extraction_status?: string
          extractor_model?: string | null
          extractor_name?: string | null
          extractor_version?: string | null
          id?: string
          normalized_payload?: Json | null
          raw_payload?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_payload?: Json | null
          scan_type?: string
          source_image_path?: string | null
          source_image_url?: string | null
          style_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "fabric_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_links: {
        Row: {
          access_count: number
          created_at: string
          created_by: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          link_type: string
          password_hash: string | null
          style_id: string | null
          token: string
          vendor_id: string | null
        }
        Insert: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          link_type: string
          password_hash?: string | null
          style_id?: string | null
          token: string
          vendor_id?: string | null
        }
        Update: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          link_type?: string
          password_hash?: string | null
          style_id?: string | null
          token?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_links_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "fabric_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_links_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_images: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          display_order: number
          event_id: string
          file_size_bytes: number | null
          height: number | null
          id: string
          image_type: string
          is_primary: boolean
          mime_type: string | null
          public_url: string | null
          storage_path: string
          vendor_id: string
          was_source_info_image: boolean
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by: string
          display_order?: number
          event_id: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_type?: string
          is_primary?: boolean
          mime_type?: string | null
          public_url?: string | null
          storage_path: string
          vendor_id: string
          was_source_info_image?: boolean
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          display_order?: number
          event_id?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          image_type?: string
          is_primary?: boolean
          mime_type?: string | null
          public_url?: string | null
          storage_path?: string
          vendor_id?: string
          was_source_info_image?: boolean
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_images_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          booth_number: string | null
          brand_names: Json
          company_name: string
          contact_person: string | null
          country_of_origin: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          email: string | null
          event_id: string
          extracted_at: string | null
          extraction_confidence: number | null
          extraction_status: string | null
          extraction_warnings: Json
          id: string
          notes: string | null
          phone: string | null
          source: string
          source_info_image_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version: number
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          booth_number?: string | null
          brand_names?: Json
          company_name: string
          contact_person?: string | null
          country_of_origin?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          email?: string | null
          event_id: string
          extracted_at?: string | null
          extraction_confidence?: number | null
          extraction_status?: string | null
          extraction_warnings?: Json
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string
          source_info_image_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          booth_number?: string | null
          brand_names?: Json
          company_name?: string
          contact_person?: string | null
          country_of_origin?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          email?: string | null
          event_id?: string
          extracted_at?: string | null
          extraction_confidence?: number | null
          extraction_status?: string | null
          extraction_warnings?: Json
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string
          source_info_image_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_source_info_image_id_fkey"
            columns: ["source_info_image_id"]
            isOneToOne: false
            referencedRelation: "vendor_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_fabric_style: {
        Args: {
          p_category: string
          p_composition: string
          p_construction: string
          p_created_by: string
          p_event_id: string
          p_finish: string
          p_item_code: string
          p_metadata: Json
          p_name: string
          p_pattern: string
          p_reviewed_payload: Json
          p_scan_session_id: string
          p_season: string
          p_vendor_id: string
          p_weight_gsm: number
          p_weight_ozsy: number
          p_width_cm: number
          p_width_in: number
        }
        Returns: Json
      }
      commit_vendor: {
        Args: {
          p_address: string
          p_booth_number: string
          p_brand_names: Json
          p_company_name: string
          p_contact_person: string
          p_country_of_origin: string
          p_created_by: string
          p_email: string
          p_event_id: string
          p_notes: string
          p_phone: string
          p_reviewed_payload: Json
          p_scan_session_id: string
          p_website_url: string
          p_whatsapp: string
        }
        Returns: Json
      }
      ensure_default_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      event_role: { Args: { target_event_id: string }; Returns: string }
      find_orphaned_storage_objects: {
        Args: { p_batch_size?: number; p_bucket_id: string }
        Returns: {
          created_at: string
          name: string
        }[]
      }
      increment_link_access: { Args: { link_id: string }; Returns: undefined }
      is_event_member: { Args: { target_event_id: string }; Returns: boolean }
      is_event_member_rls_safe: {
        Args: { target_event_id: string }
        Returns: boolean
      }
      mark_notifications_read: {
        Args: { p_user_id?: string }
        Returns: undefined
      }
      trigger_notification: {
        Args: { p_data?: Json; p_type: string; p_user_id: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
