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
      chat_logs: {
        Row: {
          id: string
          message: string | null
          owner_id: string
          request_id: string | null
          role: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          message?: string | null
          owner_id: string
          request_id?: string | null
          role?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          message?: string | null
          owner_id?: string
          request_id?: string | null
          role?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      fin_users: {
        Row: {
          balance: number
          created_at: string
          id: string
          monthly_essentials: number
          monthly_income: number
          name: string | null
          owner_id: string
          preferences: Json
          preferred_min_balance: number
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          monthly_essentials?: number
          monthly_income?: number
          name?: string | null
          owner_id: string
          preferences?: Json
          preferred_min_balance?: number
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          monthly_essentials?: number
          monthly_income?: number
          name?: string | null
          owner_id?: string
          preferences?: Json
          preferred_min_balance?: number
          user_id?: string
        }
        Relationships: []
      }
      media_analysis: {
        Row: {
          confidence: number | null
          created_at: string
          extracted_text: string | null
          filename: string | null
          id: string
          owner_id: string
          request_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          extracted_text?: string | null
          filename?: string | null
          id?: string
          owner_id: string
          request_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          extracted_text?: string | null
          filename?: string | null
          id?: string
          owner_id?: string
          request_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          amount: number
          context: string | null
          created_at: string
          id: string
          item_description: string | null
          owner_id: string
          request_id: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          context?: string | null
          created_at?: string
          id?: string
          item_description?: string | null
          owner_id: string
          request_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          context?: string | null
          created_at?: string
          id?: string
          item_description?: string | null
          owner_id?: string
          request_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          affordability_status: string | null
          amount_requested: number | null
          amount_safe_to_pay: number | null
          created_at: string
          decision_explanation: string | null
          earliest_date_for_full_payment: string | null
          id: string
          owner_id: string
          payment_plan: string | null
          recommended_payment_method: string | null
          request_id: string
          spending_changes_needed: string | null
          user_id: string | null
        }
        Insert: {
          affordability_status?: string | null
          amount_requested?: number | null
          amount_safe_to_pay?: number | null
          created_at?: string
          decision_explanation?: string | null
          earliest_date_for_full_payment?: string | null
          id?: string
          owner_id: string
          payment_plan?: string | null
          recommended_payment_method?: string | null
          request_id: string
          spending_changes_needed?: string | null
          user_id?: string | null
        }
        Update: {
          affordability_status?: string | null
          amount_requested?: number | null
          amount_safe_to_pay?: number | null
          created_at?: string
          decision_explanation?: string | null
          earliest_date_for_full_payment?: string | null
          id?: string
          owner_id?: string
          payment_plan?: string | null
          recommended_payment_method?: string | null
          request_id?: string
          spending_changes_needed?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string | null
          id: string
          owner_id: string
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string | null
          id?: string
          owner_id: string
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string | null
          id?: string
          owner_id?: string
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
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
