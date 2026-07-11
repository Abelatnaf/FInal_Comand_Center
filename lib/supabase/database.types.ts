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
      categories: {
        Row: {
          id: number
          monthly_budget: number
          name: string
          sort_order: number
        }
        Insert: {
          id?: number
          monthly_budget?: number
          name: string
          sort_order: number
        }
        Update: {
          id?: number
          monthly_budget?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      income: {
        Row: {
          amount_original: number
          amount_usd: number | null
          cadet_week: number | null
          created_at: string
          currency: string
          date: string
          id: string
          notes: string | null
          source: string | null
        }
        Insert: {
          amount_original: number
          amount_usd?: number | null
          cadet_week?: number | null
          created_at?: string
          currency: string
          date: string
          id?: string
          notes?: string | null
          source?: string | null
        }
        Update: {
          amount_original?: number
          amount_usd?: number | null
          cadet_week?: number | null
          created_at?: string
          currency?: string
          date?: string
          id?: string
          notes?: string | null
          source?: string | null
        }
        Relationships: []
      }
      key_dates: {
        Row: {
          budget_note: string | null
          event: string
          id: number
          sort_order: number
          status: string
          window_label: string
        }
        Insert: {
          budget_note?: string | null
          event: string
          id?: number
          sort_order: number
          status: string
          window_label: string
        }
        Update: {
          budget_note?: string | null
          event?: string
          id?: number
          sort_order?: number
          status?: string
          window_label?: string
        }
        Relationships: []
      }
      net_worth_snapshots: {
        Row: {
          ally_actual: number
          cash_actual: number
          created_at: string
          id: string
          notes: string | null
          snapshot_date: string
          sofi_actual: number
        }
        Insert: {
          ally_actual?: number
          cash_actual?: number
          created_at?: string
          id?: string
          notes?: string | null
          snapshot_date: string
          sofi_actual?: number
        }
        Update: {
          ally_actual?: number
          cash_actual?: number
          created_at?: string
          id?: string
          notes?: string | null
          snapshot_date?: string
          sofi_actual?: number
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          active: boolean
          billing_day: number | null
          category_id: number | null
          id: string
          monthly_cost_usd: number
          name: string
          payment_method: string | null
        }
        Insert: {
          active?: boolean
          billing_day?: number | null
          category_id?: number | null
          id?: string
          monthly_cost_usd: number
          name: string
          payment_method?: string | null
        }
        Update: {
          active?: boolean
          billing_day?: number | null
          category_id?: number | null
          id?: string
          monthly_cost_usd?: number
          name?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_vs_actual_this_month"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "recurring_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "life_to_date_spend_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "recurring_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_category_totals"
            referencedColumns: ["category_id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          created_at: string
          id: string
          name: string
          saved_so_far_usd: number
          target_amount_usd: number
          target_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          saved_so_far_usd?: number
          target_amount_usd: number
          target_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          saved_so_far_usd?: number
          target_amount_usd?: number
          target_date?: string | null
        }
        Relationships: []
      }
      semesters: {
        Row: {
          end_date: string
          id: number
          name: string
          start_date: string
        }
        Insert: {
          end_date: string
          id?: number
          name: string
          start_date: string
        }
        Update: {
          end_date?: string
          id?: number
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          fx_rate: number
          id: number
          matriculation_date: string
          starting_ally: number
          starting_cash: number
          starting_sofi: number
          updated_at: string
        }
        Insert: {
          fx_rate?: number
          id?: number
          matriculation_date?: string
          starting_ally?: number
          starting_cash?: number
          starting_sofi?: number
          updated_at?: string
        }
        Update: {
          fx_rate?: number
          id?: number
          matriculation_date?: string
          starting_ally?: number
          starting_cash?: number
          starting_sofi?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_original: number
          amount_usd: number | null
          cadet_week: number | null
          category_id: number | null
          created_at: string
          currency: string
          date: string
          description: string | null
          id: string
          is_recurring: boolean
          necessity: string | null
          notes: string | null
          payment_method: string | null
        }
        Insert: {
          amount_original: number
          amount_usd?: number | null
          cadet_week?: number | null
          category_id?: number | null
          created_at?: string
          currency: string
          date: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          necessity?: string | null
          notes?: string | null
          payment_method?: string | null
        }
        Update: {
          amount_original?: number
          amount_usd?: number | null
          cadet_week?: number | null
          category_id?: number | null
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          necessity?: string | null
          notes?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_vs_actual_this_month"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "life_to_date_spend_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_category_totals"
            referencedColumns: ["category_id"]
          },
        ]
      }
    }
    Views: {
      account_balance: {
        Row: {
          current_balance: number | null
        }
        Relationships: []
      }
      budget_vs_actual_this_month: {
        Row: {
          actual: number | null
          budget: number | null
          category: string | null
          category_id: number | null
          sort_order: number | null
        }
        Relationships: []
      }
      life_to_date_spend_by_category: {
        Row: {
          category: string | null
          category_id: number | null
          sort_order: number | null
          total: number | null
        }
        Relationships: []
      }
      monthly_category_totals: {
        Row: {
          category: string | null
          category_id: number | null
          month: string | null
          sort_order: number | null
          total: number | null
        }
        Relationships: []
      }
      monthly_rollup: {
        Row: {
          month: string | null
          net: number | null
          running_balance: number | null
          total_expenses: number | null
          total_income: number | null
        }
        Relationships: []
      }
      net_worth_variance: {
        Row: {
          ally_actual: number | null
          cash_actual: number | null
          computed_balance: number | null
          id: string | null
          notes: string | null
          snapshot_date: string | null
          sofi_actual: number | null
          total_actual: number | null
          variance: number | null
        }
        Relationships: []
      }
      savings_goal_progress: {
        Row: {
          id: string | null
          monthly_needed: number | null
          name: string | null
          percent_complete: number | null
          remaining: number | null
          saved_so_far_usd: number | null
          target_amount_usd: number | null
          target_date: string | null
        }
        Insert: {
          id?: string | null
          monthly_needed?: never
          name?: string | null
          percent_complete?: never
          remaining?: never
          saved_so_far_usd?: number | null
          target_amount_usd?: number | null
          target_date?: string | null
        }
        Update: {
          id?: string | null
          monthly_needed?: never
          name?: string | null
          percent_complete?: never
          remaining?: never
          saved_so_far_usd?: number | null
          target_amount_usd?: number | null
          target_date?: string | null
        }
        Relationships: []
      }
      semester_pacing: {
        Row: {
          actual_spend: number | null
          budget: number | null
          elapsed_days: number | null
          elapsed_percent: number | null
          end_date: string | null
          id: number | null
          income: number | null
          name: string | null
          spend_percent: number | null
          start_date: string | null
          status: string | null
          total_days: number | null
        }
        Relationships: []
      }
      weekly_rollup: {
        Row: {
          cadet_week: number | null
          discretionary: number | null
          necessary: number | null
          net: number | null
          running_balance: number | null
          total_expenses: number | null
          total_income: number | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: []
      }
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
