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
          credit_limit_minor: number | null
          id: string
          institution: string | null
          is_archived: boolean
          kind: string
          name: string
          opening_balance_minor: number
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_limit_minor?: number | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          kind: string
          name: string
          opening_balance_minor?: number
          user_id: string
        }
        Update: {
          created_at?: string
          credit_limit_minor?: number | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          kind?: string
          name?: string
          opening_balance_minor?: number
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_archived: boolean
          kind: string
          monthly_budget_usd_minor: number | null
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_archived?: boolean
          kind: string
          monthly_budget_usd_minor?: number | null
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_archived?: boolean
          kind?: string
          monthly_budget_usd_minor?: number | null
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      category_rules: {
        Row: {
          category_id: string
          created_at: string
          id: string
          match_text: string
          priority: number
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          match_text: string
          priority?: number
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          match_text?: string
          priority?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_status"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_month"
            referencedColumns: ["category_id"]
          },
        ]
      }
      obligation_installments: {
        Row: {
          amount_usd_minor: number
          created_at: string
          due_on: string | null
          id: string
          obligation_id: string
          seq: number
          user_id: string
        }
        Insert: {
          amount_usd_minor: number
          created_at?: string
          due_on?: string | null
          id?: string
          obligation_id: string
          seq: number
          user_id: string
        }
        Update: {
          amount_usd_minor?: number
          created_at?: string
          due_on?: string | null
          id?: string
          obligation_id?: string
          seq?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligation_installments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligation_progress"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "obligation_installments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligations: {
        Row: {
          amount_usd_minor: number
          created_at: string
          due_on: string | null
          id: string
          recur_interval_months: number | null
          recur_spawned_at: string | null
          source_note: string | null
          statement_path: string | null
          title: string
          user_id: string
          waived_at: string | null
        }
        Insert: {
          amount_usd_minor: number
          created_at?: string
          due_on?: string | null
          id?: string
          recur_interval_months?: number | null
          recur_spawned_at?: string | null
          source_note?: string | null
          statement_path?: string | null
          title: string
          user_id: string
          waived_at?: string | null
        }
        Update: {
          amount_usd_minor?: number
          created_at?: string
          due_on?: string | null
          id?: string
          recur_interval_months?: number | null
          recur_spawned_at?: string | null
          source_note?: string | null
          statement_path?: string | null
          title?: string
          user_id?: string
          waived_at?: string | null
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          account_id: string
          amount_minor: number
          auto_post: boolean
          cadence: string
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          last_posted_on: string | null
          name: string
          next_due_on: string
          note: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount_minor: number
          auto_post?: boolean
          cadence: string
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_posted_on?: string | null
          name: string
          next_due_on: string
          note?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount_minor?: number
          auto_post?: boolean
          cadence?: string
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_posted_on?: string | null
          name?: string
          next_due_on?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_status"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_month"
            referencedColumns: ["category_id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          saved_manual_minor: number
          target_date: string | null
          target_minor: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          saved_manual_minor?: number
          target_date?: string | null
          target_minor: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          saved_manual_minor?: number
          target_date?: string | null
          target_minor?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          display_name: string | null
          id: number
          onboarding_completed: boolean
          tracking_start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: never
          onboarding_completed?: boolean
          tracking_start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: never
          onboarding_completed?: boolean
          tracking_start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount_minor: number
          category_id: string | null
          created_at: string
          direction: string
          id: string
          is_tax_deductible: boolean
          note: string | null
          obligation_id: string | null
          occurred_on: string
          receipt_path: string | null
          tags: string[]
          user_id: string
        }
        Insert: {
          account_id: string
          amount_minor: number
          category_id?: string | null
          created_at?: string
          direction: string
          id?: string
          is_tax_deductible?: boolean
          note?: string | null
          obligation_id?: string | null
          occurred_on?: string
          receipt_path?: string | null
          tags?: string[]
          user_id: string
        }
        Update: {
          account_id?: string
          amount_minor?: number
          category_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_tax_deductible?: boolean
          note?: string | null
          obligation_id?: string | null
          occurred_on?: string
          receipt_path?: string | null
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_status"
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
            referencedRelation: "category_spend_by_month"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligation_progress"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "transactions_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount_minor: number
          created_at: string
          from_account_id: string
          id: string
          note: string | null
          occurred_on: string
          to_account_id: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          from_account_id: string
          id?: string
          note?: string | null
          occurred_on?: string
          to_account_id: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          from_account_id?: string
          id?: string
          note?: string | null
          occurred_on?: string
          to_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
        ]
      }
    }
    Views: {
      balance_by_account: {
        Row: {
          account_id: string | null
          balance_minor: number | null
          credit_limit_minor: number | null
          institution: string | null
          is_archived: boolean | null
          is_liability: boolean | null
          kind: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          balance_minor?: never
          credit_limit_minor?: number | null
          institution?: string | null
          is_archived?: boolean | null
          is_liability?: never
          kind?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          balance_minor?: never
          credit_limit_minor?: number | null
          institution?: string | null
          is_archived?: boolean | null
          is_liability?: never
          kind?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budget_status: {
        Row: {
          category_id: string | null
          color: string | null
          icon: string | null
          monthly_budget_usd_minor: number | null
          name: string | null
          percent_used: number | null
          remaining_usd_minor: number | null
          sort_order: number | null
          spent_usd_minor: number | null
          user_id: string | null
        }
        Relationships: []
      }
      category_spend_by_month: {
        Row: {
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          entry_count: number | null
          month: string | null
          spent_usd_minor: number | null
          user_id: string | null
        }
        Relationships: []
      }
      installment_progress: {
        Row: {
          amount_covered_minor: number | null
          amount_usd_minor: number | null
          cumulative_before_minor: number | null
          due_on: string | null
          installment_id: string | null
          is_past_due: boolean | null
          is_settled: boolean | null
          obligation_id: string | null
          seq: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_installments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligation_progress"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "obligation_installments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      liquid_position: {
        Row: {
          net_worth_usd_minor: number | null
          total_debt_usd_minor: number | null
          total_liquid_usd_minor: number | null
          user_id: string | null
        }
        Relationships: []
      }
      monthly_summary: {
        Row: {
          entry_count: number | null
          income_usd_minor: number | null
          month: string | null
          net_usd_minor: number | null
          spent_usd_minor: number | null
          user_id: string | null
        }
        Relationships: []
      }
      net_worth_by_month: {
        Row: {
          month: string | null
          net_worth_usd_minor: number | null
          user_id: string | null
        }
        Relationships: []
      }
      obligation_progress: {
        Row: {
          amount_paid_usd_minor: number | null
          amount_remaining_usd_minor: number | null
          amount_usd_minor: number | null
          days_until_due: number | null
          due_on: string | null
          is_past_due: boolean | null
          obligation_id: string | null
          source_note: string | null
          status: string | null
          title: string | null
          user_id: string | null
          waived_at: string | null
        }
        Relationships: []
      }
      savings_goal_progress: {
        Row: {
          account_id: string | null
          account_name: string | null
          created_at: string | null
          days_until_target: number | null
          id: string | null
          name: string | null
          note: string | null
          remaining_minor: number | null
          saved_minor: number | null
          target_date: string | null
          target_minor: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
        ]
      }
      transactions_with_week: {
        Row: {
          account_id: string | null
          amount_minor: number | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          direction: string | null
          id: string | null
          is_tax_deductible: boolean | null
          note: string | null
          tags: string[] | null
          obligation_id: string | null
          occurred_on: string | null
          receipt_path: string | null
          user_id: string | null
          week_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_status"
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
            referencedRelation: "category_spend_by_month"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "transactions_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligation_progress"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "transactions_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assert_owned: {
        Args: {
          p_id: string
          p_label: string
          p_table: string
          p_user_id: string
        }
        Returns: undefined
      }
      delete_own_account: { Args: never; Returns: undefined }
      get_shared_snapshot: {
        Args: { p_token: string }
        Returns: {
          balances: Json
          found: boolean
          net_worth_usd_minor: number
          next_due_days_until_due: number
          next_due_is_past_due: boolean
          next_due_remaining_usd_minor: number
          next_due_title: string
          total_liquid_usd_minor: number
        }[]
      }
      post_due_recurring_expenses: { Args: never; Returns: number }
      restore_from_backup: { Args: { p_backup: Json }; Returns: Json }
      spawn_due_recurring_obligations: { Args: never; Returns: number }
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
