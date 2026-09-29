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
  public: {
    Tables: {
      google_review_snapshots: {
        Row: {
          fetched_at: string
          google_maps_uri: string | null
          place_id: string
          rating: number | null
          restaurant_id: string
          reviews: Json
          user_rating_count: number
        }
        Insert: {
          fetched_at?: string
          google_maps_uri?: string | null
          place_id: string
          rating?: number | null
          restaurant_id: string
          reviews?: Json
          user_rating_count?: number
        }
        Update: {
          fetched_at?: string
          google_maps_uri?: string | null
          place_id?: string
          rating?: number | null
          restaurant_id?: string
          reviews?: Json
          user_rating_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "google_review_snapshots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          restaurant_id: string | null
          table_number: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          restaurant_id?: string | null
          table_number: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string | null
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "guests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          category: string
          category_fr: string | null
          category_he: string | null
          created_at: string
          description: string
          description_fr: string | null
          description_he: string | null
          id: string
          image_url: string | null
          name: string
          name_fr: string | null
          name_he: string | null
          price_cents: number
          restaurant_id: string | null
          sort_order: number
        }
        Insert: {
          available?: boolean
          category?: string
          category_fr?: string | null
          category_he?: string | null
          created_at?: string
          description?: string
          description_fr?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_fr?: string | null
          name_he?: string | null
          price_cents?: number
          restaurant_id?: string | null
          sort_order?: number
        }
        Update: {
          available?: boolean
          category?: string
          category_fr?: string | null
          category_he?: string | null
          created_at?: string
          description?: string
          description_fr?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_fr?: string | null
          name_he?: string | null
          price_cents?: number
          restaurant_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          guest_id: string | null
          guest_name: string
          id: string
          item_name: string
          menu_item_id: string | null
          note: string
          paid: boolean
          quantity: number
          ready_at: string | null
          restaurant_id: string | null
          sent_at: string | null
          status: string
          table_number: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          guest_name?: string
          id?: string
          item_name: string
          menu_item_id?: string | null
          note?: string
          paid?: boolean
          quantity?: number
          ready_at?: string | null
          restaurant_id?: string | null
          sent_at?: string | null
          status?: string
          table_number: number
          unit_price_cents?: number
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          guest_name?: string
          id?: string
          item_name?: string
          menu_item_id?: string | null
          note?: string
          paid?: boolean
          quantity?: number
          ready_at?: string | null
          restaurant_id?: string | null
          sent_at?: string | null
          status?: string
          table_number?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          guest_name: string
          id: string
          method: string
          mode: string
          restaurant_id: string | null
          table_number: number
          tip_cents: number
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          guest_name?: string
          id?: string
          method?: string
          mode?: string
          restaurant_id?: string | null
          table_number: number
          tip_cents?: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          guest_name?: string
          id?: string
          method?: string
          mode?: string
          restaurant_id?: string | null
          table_number?: number
          tip_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          restaurant_name: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          restaurant_name: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          restaurant_name?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          created_at: string
          id: string
          number: number
          restaurant_id: string | null
          seats: number
          waiter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          number: number
          restaurant_id?: string | null
          seats?: number
          waiter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          number?: number
          restaurant_id?: string | null
          seats?: number
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          brand_ink: string | null
          brand_primary: string | null
          brand_vibe: string | null
          brand_wash: string | null
          city: string
          created_at: string
          google_place_id: string | null
          google_review_url: string | null
          id: string
          name: string
          name_he: string | null
          owner_id: string | null
          slug: string
          tagline_en: string | null
          tagline_fr: string | null
          tagline_he: string | null
        }
        Insert: {
          brand_ink?: string | null
          brand_primary?: string | null
          brand_vibe?: string | null
          brand_wash?: string | null
          city?: string
          created_at?: string
          google_place_id?: string | null
          google_review_url?: string | null
          id?: string
          name: string
          name_he?: string | null
          owner_id?: string | null
          slug: string
          tagline_en?: string | null
          tagline_fr?: string | null
          tagline_he?: string | null
        }
        Update: {
          brand_ink?: string | null
          brand_primary?: string | null
          brand_vibe?: string | null
          brand_wash?: string | null
          city?: string
          created_at?: string
          google_place_id?: string | null
          google_review_url?: string | null
          id?: string
          name?: string
          name_he?: string | null
          owner_id?: string | null
          slug?: string
          tagline_en?: string | null
          tagline_fr?: string | null
          tagline_he?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          created_at: string
          id: string
          kind: string
          note: string
          resolved: boolean
          restaurant_id: string | null
          table_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          note?: string
          resolved?: boolean
          restaurant_id?: string | null
          table_number: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          note?: string
          resolved?: boolean
          restaurant_id?: string | null
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      waiters: {
        Row: {
          access_code: string | null
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          restaurant_id: string | null
          role: string
        }
        Insert: {
          access_code?: string | null
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          restaurant_id?: string | null
          role?: string
        }
        Update: {
          access_code?: string | null
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiters_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
