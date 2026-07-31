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
          currency: string
          id: string
          is_archived: boolean
          kind: string
          name: string
          opening_balance_minor: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          is_archived?: boolean
          kind: string
          name: string
          opening_balance_minor?: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_archived?: boolean
          kind?: string
          name?: string
          opening_balance_minor?: number
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          effective_on: string
          etb_per_usd: number
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_on: string
          etb_per_usd: number
          id?: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          effective_on?: string
          etb_per_usd?: number
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
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
          payer_id: string
          recur_interval_months: number | null
          recur_spawned_at: string | null
          source_note: string | null
          title: string
          user_id: string
          waived_at: string | null
        }
        Insert: {
          amount_usd_minor: number
          created_at?: string
          due_on?: string | null
          id?: string
          payer_id: string
          recur_interval_months?: number | null
          recur_spawned_at?: string | null
          source_note?: string | null
          title: string
          user_id: string
          waived_at?: string | null
        }
        Update: {
          amount_usd_minor?: number
          created_at?: string
          due_on?: string | null
          id?: string
          payer_id?: string
          recur_interval_months?: number | null
          recur_spawned_at?: string | null
          source_note?: string | null
          title?: string
          user_id?: string
          waived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligations_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          class_year: number | null
          created_at: string
          id: string
          is_default: boolean
          key: string
          label: string
          user_id: string
        }
        Insert: {
          class_year?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          key: string
          label: string
          user_id: string
        }
        Update: {
          class_year?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          key?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: number
          tracking_start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          tracking_start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
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
          amount_usd_minor: number
          category: string | null
          created_at: string
          currency: string
          direction: string
          fx_rate_etb_per_usd: number
          id: string
          note: string | null
          obligation_id: string | null
          occurred_on: string
          payer_id: string
          receipt_path: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount_minor: number
          amount_usd_minor: number
          category?: string | null
          created_at?: string
          currency: string
          direction: string
          fx_rate_etb_per_usd: number
          id?: string
          note?: string | null
          obligation_id?: string | null
          occurred_on?: string
          payer_id: string
          receipt_path?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount_minor?: number
          amount_usd_minor?: number
          category?: string | null
          created_at?: string
          currency?: string
          direction?: string
          fx_rate_etb_per_usd?: number
          id?: string
          note?: string | null
          obligation_id?: string | null
          occurred_on?: string
          payer_id?: string
          receipt_path?: string | null
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
          {
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          from_account_id: string
          from_amount_minor: number
          id: string
          note: string | null
          occurred_on: string
          to_account_id: string
          to_amount_minor: number
          user_id: string
        }
        Insert: {
          created_at?: string
          from_account_id: string
          from_amount_minor: number
          id?: string
          note?: string | null
          occurred_on?: string
          to_account_id: string
          to_amount_minor: number
          user_id: string
        }
        Update: {
          created_at?: string
          from_account_id?: string
          from_amount_minor?: number
          id?: string
          note?: string | null
          occurred_on?: string
          to_account_id?: string
          to_amount_minor?: number
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
      balance_by_account: {
        Row: {
          account_id: string | null
          balance_minor: number | null
          currency: string | null
          is_archived: boolean | null
          kind: string | null
          name: string | null
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
          fx_rate_effective_on: string | null
          fx_rate_used: number | null
          total_liquid_usd_minor: number | null
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
          payer_id: string | null
          source_note: string | null
          status: string | null
          title: string | null
          user_id: string | null
          waived_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligations_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_with_week: {
        Row: {
          account_id: string | null
          amount_minor: number | null
          amount_usd_minor: number | null
          category: string | null
          created_at: string | null
          currency: string | null
          direction: string | null
          fx_rate_etb_per_usd: number | null
          id: string | null
          note: string | null
          obligation_id: string | null
          occurred_on: string | null
          payer_id: string | null
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
          {
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_shared_snapshot: {
        Args: { p_token: string }
        Returns: {
          balances: Json
          found: boolean
          fx_rate_effective_on: string
          next_due_days_until_due: number
          next_due_is_past_due: boolean
          next_due_payer_label: string
          next_due_remaining_usd_minor: number
          next_due_title: string
          total_liquid_usd_minor: number
        }[]
      }
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
