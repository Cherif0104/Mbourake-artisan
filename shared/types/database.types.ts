export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artisans: {
        Row: {
          bio: string | null
          can_receive_advance: boolean | null
          category_id: number | null
          certification_number: string | null
          created_at: string | null
          experience_years: number | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          partner_credit_enabled: boolean | null
          portfolio_urls: Json | null
          rating_avg: number | null
          specialty: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          video_urls: string[] | null
        }
        Insert: {
          bio?: string | null
          can_receive_advance?: boolean | null
          category_id?: number | null
          certification_number?: string | null
          created_at?: string | null
          experience_years?: number | null
          id: string
          is_available?: boolean | null
          is_verified?: boolean | null
          partner_credit_enabled?: boolean | null
          portfolio_urls?: Json | null
          rating_avg?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          video_urls?: string[] | null
        }
        Update: {
          bio?: string | null
          can_receive_advance?: boolean | null
          category_id?: number | null
          certification_number?: string | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          partner_credit_enabled?: boolean | null
          portfolio_urls?: Json | null
          rating_avg?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "artisans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artisans_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artisans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_type: string | null
          icon_name: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          category_type?: string | null
          icon_name?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          category_type?: string | null
          icon_name?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      escrows: {
        Row: {
          advance_amount: number | null
          advance_paid: number | null
          advance_percent: number | null
          artisan_payout: number | null
          base_amount: number | null
          commission_amount: number | null
          commission_percent: number | null
          commission_rate: number | null
          created_at: string | null
          id: string
          is_advance_paid: boolean | null
          payment_method: string | null
          platform_commission: number | null
          project_id: string | null
          status: string | null
          total_amount: number
          transaction_number: string | null
          tva_amount: number | null
          updated_at: string | null
          urgent_surcharge: number | null
        }
        Insert: {
          advance_amount?: number | null
          advance_paid?: number | null
          advance_percent?: number | null
          artisan_payout?: number | null
          base_amount?: number | null
          commission_amount?: number | null
          commission_percent?: number | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_advance_paid?: boolean | null
          payment_method?: string | null
          platform_commission?: number | null
          project_id?: string | null
          status?: string | null
          total_amount: number
          transaction_number?: string | null
          tva_amount?: number | null
          updated_at?: string | null
          urgent_surcharge?: number | null
        }
        Update: {
          advance_amount?: number | null
          advance_paid?: number | null
          advance_percent?: number | null
          artisan_payout?: number | null
          base_amount?: number | null
          commission_amount?: number | null
          commission_percent?: number | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_advance_paid?: boolean | null
          payment_method?: string | null
          platform_commission?: number | null
          project_id?: string | null
          status?: string | null
          total_amount?: number
          transaction_number?: string | null
          tva_amount?: number | null
          updated_at?: string | null
          urgent_surcharge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escrows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string | null
          created_at: string | null
          id: string
          project_id: string | null
          sender_id: string | null
          type: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          sender_id?: string | null
          type?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          sender_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category_id: number | null
          commune: string | null
          company_name: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          location: string | null
          member_id: string | null
          phone: string | null
          region: string | null
          role: string | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category_id?: number | null
          commune?: string | null
          company_name?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          location?: string | null
          member_id?: string | null
          phone?: string | null
          region?: string | null
          role?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category_id?: number | null
          commune?: string | null
          company_name?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          member_id?: string | null
          phone?: string | null
          region?: string | null
          role?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          audio_description_url: string | null
          category_id: number | null
          client_confirmed_closure_at: string | null
          client_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_open: boolean | null
          is_urgent: boolean | null
          location: string | null
          max_distance_km: number | null
          min_rating: number | null
          photos_urls: Json | null
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          project_number: string | null
          property_details: Json | null
          status: string | null
          target_artisan_id: string | null
          title: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          audio_description_url?: string | null
          category_id?: number | null
          client_confirmed_closure_at?: string | null
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_open?: boolean | null
          is_urgent?: boolean | null
          location?: string | null
          max_distance_km?: number | null
          min_rating?: number | null
          photos_urls?: Json | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          project_number?: string | null
          property_details?: Json | null
          status?: string | null
          target_artisan_id?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          audio_description_url?: string | null
          category_id?: number | null
          client_confirmed_closure_at?: string | null
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_open?: boolean | null
          is_urgent?: boolean | null
          location?: string | null
          max_distance_km?: number | null
          min_rating?: number | null
          photos_urls?: Json | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          project_number?: string | null
          property_details?: Json | null
          status?: string | null
          target_artisan_id?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_target_artisan_id_fkey"
            columns: ["target_artisan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number
          artisan_id: string | null
          audio_message_url: string | null
          client_audio_url: string | null
          client_suggested_price: number | null
          created_at: string | null
          estimated_duration: string | null
          expires_at: string | null
          id: string
          labor_cost: number | null
          materials_cost: number | null
          message: string | null
          proforma_url: string | null
          project_id: string | null
          proposed_date: string | null
          proposed_time_end: string | null
          proposed_time_start: string | null
          quote_number: string | null
          rejection_reason: string | null
          revision_count: number | null
          revision_reason: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          updated_at: string | null
          urgent_surcharge_percent: number | null
          validity_hours: number | null
        }
        Insert: {
          amount: number
          artisan_id?: string | null
          audio_message_url?: string | null
          client_audio_url?: string | null
          client_suggested_price?: number | null
          created_at?: string | null
          estimated_duration?: string | null
          expires_at?: string | null
          id?: string
          labor_cost?: number | null
          materials_cost?: number | null
          message?: string | null
          proforma_url?: string | null
          project_id?: string | null
          proposed_date?: string | null
          proposed_time_end?: string | null
          proposed_time_start?: string | null
          quote_number?: string | null
          rejection_reason?: string | null
          revision_count?: number | null
          revision_reason?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          updated_at?: string | null
          urgent_surcharge_percent?: number | null
          validity_hours?: number | null
        }
        Update: {
          amount?: number
          artisan_id?: string | null
          audio_message_url?: string | null
          client_audio_url?: string | null
          client_suggested_price?: number | null
          created_at?: string | null
          estimated_duration?: string | null
          expires_at?: string | null
          id?: string
          labor_cost?: number | null
          materials_cost?: number | null
          message?: string | null
          proforma_url?: string | null
          project_id?: string | null
          proposed_date?: string | null
          proposed_time_end?: string | null
          proposed_time_start?: string | null
          quote_number?: string | null
          rejection_reason?: string | null
          revision_count?: number | null
          revision_reason?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          updated_at?: string | null
          urgent_surcharge_percent?: number | null
          validity_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          artisan_id: string | null
          client_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          project_id: string | null
          rating: number | null
        }
        Insert: {
          artisan_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
        }
        Update: {
          artisan_id?: string | null
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          artisan_id: string | null
          created_at: string | null
          id: string
          id_card_type: string | null
          id_card_url: string | null
          ninea_number: string | null
          ninea_url: string | null
          registre_commerce_number: string | null
          registre_commerce_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          artisan_id?: string | null
          created_at?: string | null
          id?: string
          id_card_type?: string | null
          id_card_url?: string | null
          ninea_number?: string | null
          ninea_url?: string | null
          registre_commerce_number?: string | null
          registre_commerce_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          artisan_id?: string | null
          created_at?: string | null
          id?: string
          id_card_type?: string | null
          id_card_url?: string | null
          ninea_number?: string | null
          ninea_url?: string | null
          registre_commerce_number?: string | null
          registre_commerce_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
      [_ in never]: never
    }
    Enums: {
      credit_transaction_type: "purchase" | "usage" | "refund"
      escrow_status: "pending" | "held" | "advance_paid" | "released" | "refunded" | "frozen"
      notification_type:
        | "new_project"
        | "new_quote"
        | "quote_accepted"
        | "quote_rejected"
        | "message"
        | "project_completed"
        | "payment_received"
        | "dispute_raised"
        | "quote_revision_requested"
        | "quote_revision_responded"
        | "system"
      project_status:
        | "draft"
        | "open"
        | "quote_received"
        | "quote_accepted"
        | "payment_pending"
        | "payment_received"
        | "in_progress"
        | "completion_requested"
        | "disputed"
        | "completed"
        | "cancelled"
        | "expired"
      quote_status:
        | "pending"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
        | "abandoned"
      reputation_level: "Bronze" | "Silver" | "Gold" | "Platinum"
      user_role: "client" | "artisan" | "admin"
      user_status: "active" | "suspended" | "banned"
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
