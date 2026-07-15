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
      accounts: {
        Row: {
          created_at: string
          id: string
          interest_rate_pct: number | null
          kind: string
          name: string
          sort_order: number
          starting_balance: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_rate_pct?: number | null
          kind?: string
          name: string
          sort_order?: number
          starting_balance?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_rate_pct?: number | null
          kind?: string
          name?: string
          sort_order?: number
          starting_balance?: number
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          monthly_budget: number
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          id?: number
          monthly_budget?: number
          name: string
          sort_order: number
          user_id?: string
        }
        Update: {
          id?: number
          monthly_budget?: number
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          rate_to_usd: number
          sort_order: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          rate_to_usd: number
          sort_order?: number
          user_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          rate_to_usd?: number
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          account_id: string | null
          amount_original: number
          amount_usd: number | null
          created_at: string
          currency: string
          date: string
          fx_rate_used: number | null
          id: string
          notes: string | null
          source: string | null
          user_id: string
          week_number: number | null
        }
        Insert: {
          account_id?: string | null
          amount_original: number
          amount_usd?: number | null
          created_at?: string
          currency: string
          date: string
          fx_rate_used?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          user_id?: string
          week_number?: number | null
        }
        Update: {
          account_id?: string | null
          amount_original?: number
          amount_usd?: number | null
          created_at?: string
          currency?: string
          date?: string
          fx_rate_used?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          user_id?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "income_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "income_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      key_dates: {
        Row: {
          budget_note: string | null
          event: string
          id: number
          sort_order: number
          status: string
          user_id: string
          window_label: string
        }
        Insert: {
          budget_note?: string | null
          event: string
          id?: number
          sort_order: number
          status: string
          user_id?: string
          window_label: string
        }
        Update: {
          budget_note?: string | null
          event?: string
          id?: number
          sort_order?: number
          status?: string
          user_id?: string
          window_label?: string
        }
        Relationships: []
      }
      net_worth_snapshot_balances: {
        Row: {
          account_id: string
          amount: number
          id: string
          snapshot_id: string
        }
        Insert: {
          account_id: string
          amount?: number
          id?: string
          snapshot_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          id?: string
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "net_worth_snapshot_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "net_worth_snapshot_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "net_worth_snapshot_balances_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "net_worth_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "net_worth_snapshot_balances_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "net_worth_variance"
            referencedColumns: ["id"]
          },
        ]
      }
      net_worth_snapshots: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          snapshot_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          snapshot_date: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          snapshot_date?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          active: boolean
          billing_day: number | null
          category_id: number | null
          id: string
          last_posted_date: string | null
          monthly_cost_usd: number
          name: string
          payment_method: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          billing_day?: number | null
          category_id?: number | null
          id?: string
          last_posted_date?: string | null
          monthly_cost_usd: number
          name: string
          payment_method?: string | null
          user_id?: string
        }
        Update: {
          active?: boolean
          billing_day?: number | null
          category_id?: number | null
          id?: string
          last_posted_date?: string | null
          monthly_cost_usd?: number
          name?: string
          payment_method?: string | null
          user_id?: string
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
      recurring_income: {
        Row: {
          account_id: string | null
          active: boolean
          amount_usd: number
          billing_day: number | null
          created_at: string
          id: string
          last_posted_date: string | null
          source: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount_usd: number
          billing_day?: number | null
          created_at?: string
          id?: string
          last_posted_date?: string | null
          source: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount_usd?: number
          billing_day?: number | null
          created_at?: string
          id?: string
          last_posted_date?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_income_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "recurring_income_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          name: string
          saved_so_far_usd: number
          target_amount_usd: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          name: string
          saved_so_far_usd?: number
          target_amount_usd: number
          target_date?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          name?: string
          saved_so_far_usd?: number
          target_amount_usd?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          end_date: string
          id: number
          name: string
          start_date: string
          user_id: string
        }
        Insert: {
          end_date: string
          id?: number
          name: string
          start_date: string
          user_id?: string
        }
        Update: {
          end_date?: string
          id?: number
          name?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          low_balance_threshold: number | null
          onboarding_dismissed: boolean
          tracking_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: number
          low_balance_threshold?: number | null
          onboarding_dismissed?: boolean
          tracking_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          id?: number
          low_balance_threshold?: number | null
          onboarding_dismissed?: boolean
          tracking_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_splits: {
        Row: {
          amount_usd: number
          category_id: number | null
          created_at: string
          id: string
          transaction_id: string
        }
        Insert: {
          amount_usd: number
          category_id?: number | null
          created_at?: string
          id?: string
          transaction_id: string
        }
        Update: {
          amount_usd?: number
          category_id?: number | null
          created_at?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_vs_actual_this_month"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "life_to_date_spend_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_category_totals"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount_original: number
          amount_usd: number | null
          category_id: number | null
          created_at: string
          currency: string
          date: string
          description: string | null
          fx_rate_used: number | null
          id: string
          is_recurring: boolean
          necessity: string | null
          notes: string | null
          payment_method: string | null
          receipt_path: string | null
          user_id: string
          week_number: number | null
        }
        Insert: {
          account_id?: string | null
          amount_original: number
          amount_usd?: number | null
          category_id?: number | null
          created_at?: string
          currency: string
          date: string
          description?: string | null
          fx_rate_used?: number | null
          id?: string
          is_recurring?: boolean
          necessity?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_path?: string | null
          user_id?: string
          week_number?: number | null
        }
        Update: {
          account_id?: string | null
          amount_original?: number
          amount_usd?: number | null
          category_id?: number | null
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          fx_rate_used?: number | null
          id?: string
          is_recurring?: boolean
          necessity?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_path?: string | null
          user_id?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
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
      transfers: {
        Row: {
          amount_usd: number
          created_at: string
          date: string
          from_account_id: string
          id: string
          notes: string | null
          to_account_id: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          date: string
          from_account_id: string
          id?: string
          notes?: string | null
          to_account_id: string
          user_id?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          date?: string
          from_account_id?: string
          id?: string
          notes?: string | null
          to_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balance: {
        Row: {
          current_balance: number | null
          starting_total: number | null
          total_expenses: number | null
          total_income: number | null
        }
        Relationships: []
      }
      account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          balance?: never
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          balance?: never
          user_id?: string | null
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
      net_worth_snapshot_detail: {
        Row: {
          account_id: string | null
          account_name: string | null
          amount: number | null
          snapshot_id: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "net_worth_snapshot_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "net_worth_snapshot_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "net_worth_snapshot_balances_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "net_worth_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "net_worth_snapshot_balances_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "net_worth_variance"
            referencedColumns: ["id"]
          },
        ]
      }
      net_worth_variance: {
        Row: {
          computed_balance: number | null
          id: string | null
          notes: string | null
          snapshot_date: string | null
          total_actual: number | null
          variance: number | null
        }
        Relationships: []
      }
      savings_goal_progress: {
        Row: {
          account_id: string | null
          id: string | null
          monthly_needed: number | null
          name: string | null
          percent_complete: number | null
          remaining: number | null
          saved_so_far_usd: number | null
          target_amount_usd: number | null
          target_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
      transaction_category_breakdown: {
        Row: {
          amount_usd: number | null
          category_id: number | null
          date: string | null
          necessity: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      weekly_rollup: {
        Row: {
          discretionary: number | null
          necessary: number | null
          net: number | null
          running_balance: number | null
          total_expenses: number | null
          total_income: number | null
          week_end: string | null
          week_number: number | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      post_due_recurring_bills: { Args: never; Returns: undefined }
      post_due_recurring_income: { Args: never; Returns: undefined }
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
