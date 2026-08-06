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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
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
          budget_usd_minor: number | null
          color: string
          created_at: string
          icon: string
          id: string
          is_archived: boolean
          kind: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          budget_usd_minor?: number | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_archived?: boolean
          kind: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          budget_usd_minor?: number | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_archived?: boolean
          kind?: string
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
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_term"
            referencedColumns: ["category_id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          name: string
          swipes_total: number | null
          term_id: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          name?: string
          swipes_total?: number | null
          term_id: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          name?: string
          swipes_total?: number | null
          term_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_term"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "current_term"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_burndown"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_progress"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_summary"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "transactions_with_week"
            referencedColumns: ["term_id"]
          },
        ]
      }
      meal_swipe_uses: {
        Row: {
          created_at: string
          id: string
          meal_plan_id: string
          swipes: number
          used_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_plan_id: string
          swipes?: number
          used_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_plan_id?: string
          swipes?: number
          used_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_swipe_uses_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_progress"
            referencedColumns: ["meal_plan_id"]
          },
          {
            foreignKeyName: "meal_swipe_uses_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_entries: {
        Row: {
          account_id: string
          amount_minor: number
          auto_post: boolean
          cadence: string
          category_id: string | null
          created_at: string
          direction: string
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
          direction?: string
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
          direction?: string
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
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_term"
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
      split_shares: {
        Row: {
          amount_minor: number
          created_at: string
          id: string
          person: string
          settled_at: string | null
          settled_transaction_id: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          id?: string
          person: string
          settled_at?: string | null
          settled_transaction_id?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          id?: string
          person?: string
          settled_at?: string | null
          settled_transaction_id?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_shares_settled_transaction_id_fkey"
            columns: ["settled_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_shares_settled_transaction_id_fkey"
            columns: ["settled_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_with_week"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_shares_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_shares_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_with_week"
            referencedColumns: ["id"]
          },
        ]
      }
      split_template_shares: {
        Row: {
          created_at: string
          id: string
          person: string
          share_bp: number
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person: string
          share_bp: number
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person?: string
          share_bp?: number
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_template_shares_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "split_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      split_templates: {
        Row: {
          created_at: string
          id: string
          recurring_entry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recurring_entry_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recurring_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_templates_recurring_entry_id_fkey"
            columns: ["recurring_entry_id"]
            isOneToOne: true
            referencedRelation: "recurring_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      student_loans: {
        Row: {
          created_at: string
          disbursed_on: string
          id: string
          interest_rate_bp: number
          is_subsidized: boolean
          name: string
          principal_minor: number
          servicer: string | null
          term_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          disbursed_on?: string
          id?: string
          interest_rate_bp?: number
          is_subsidized?: boolean
          name: string
          principal_minor: number
          servicer?: string | null
          term_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          disbursed_on?: string
          id?: string
          interest_rate_bp?: number
          is_subsidized?: boolean
          name?: string
          principal_minor?: number
          servicer?: string | null
          term_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_loans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_term"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "student_loans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "current_term"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "student_loans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_burndown"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "student_loans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_progress"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "student_loans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_summary"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "student_loans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_loans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "transactions_with_week"
            referencedColumns: ["term_id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          is_archived: boolean
          name: string
          starts_on: string
          target_end_balance_minor: number
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          is_archived?: boolean
          name: string
          starts_on: string
          target_end_balance_minor?: number
          user_id: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          is_archived?: boolean
          name?: string
          starts_on?: string
          target_end_balance_minor?: number
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
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_term"
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
          institution: string | null
          is_archived: boolean | null
          is_liability: boolean | null
          is_meal_plan: boolean | null
          kind: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          balance_minor?: never
          institution?: string | null
          is_archived?: boolean | null
          is_liability?: never
          is_meal_plan?: never
          kind?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          balance_minor?: never
          institution?: string | null
          is_archived?: boolean | null
          is_liability?: never
          is_meal_plan?: never
          kind?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budget_status: {
        Row: {
          budget_usd_minor: number | null
          category_id: string | null
          color: string | null
          icon: string | null
          is_term: boolean | null
          name: string | null
          percent_used: number | null
          remaining_usd_minor: number | null
          sort_order: number | null
          spent_usd_minor: number | null
          user_id: string | null
          win_end: string | null
          win_start: string | null
          window_name: string | null
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
      category_spend_by_term: {
        Row: {
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          ends_on: string | null
          entry_count: number | null
          spent_usd_minor: number | null
          starts_on: string | null
          term_id: string | null
          term_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      current_term: {
        Row: {
          ends_on: string | null
          name: string | null
          starts_on: string | null
          term_id: string | null
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
          card_balance_minor: number | null
          meal_plan_minor: number | null
          total_liquid_usd_minor: number | null
          user_id: string | null
        }
        Relationships: []
      }
      meal_plan_progress: {
        Row: {
          account_id: string | null
          days_remaining: number | null
          dining_minor: number | null
          ends_on: string | null
          meal_plan_id: string | null
          name: string | null
          starts_on: string | null
          swipes_remaining: number | null
          swipes_total: number | null
          swipes_used: number | null
          term_id: string | null
          user_id: string | null
          weeks_remaining: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "balance_by_account"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_term"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "current_term"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_burndown"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_progress"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_summary"
            referencedColumns: ["term_id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "transactions_with_week"
            referencedColumns: ["term_id"]
          },
        ]
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
      owed_to_me: {
        Row: {
          oldest_on: string | null
          owed_minor: number | null
          person: string | null
          share_count: number | null
          user_id: string | null
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
      student_loan_summary: {
        Row: {
          accrued_interest_minor: number | null
          avg_rate_percent: number | null
          balance_minor: number | null
          est_monthly_payment_minor: number | null
          loan_count: number | null
          principal_minor: number | null
          user_id: string | null
        }
        Relationships: []
      }
      term_burndown: {
        Row: {
          actual_minor: number | null
          day: string | null
          ends_on: string | null
          ideal_minor: number | null
          starts_on: string | null
          term_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      term_progress: {
        Row: {
          actual_daily_minor: number | null
          days_elapsed: number | null
          days_remaining: number | null
          ends_on: string | null
          expected_income_minor: number | null
          liquid_minor: number | null
          meal_plan_minor: number | null
          name: string | null
          projected_zero_on: string | null
          received_minor: number | null
          safe_daily_meal_minor: number | null
          safe_daily_minor: number | null
          shortfall_minor: number | null
          spendable_minor: number | null
          spent_minor: number | null
          spent_today_minor: number | null
          starts_on: string | null
          target_end_balance_minor: number | null
          term_id: string | null
          total_days: number | null
          user_id: string | null
        }
        Relationships: []
      }
      term_summary: {
        Row: {
          elapsed_days: number | null
          ends_on: string | null
          name: string | null
          net_minor: number | null
          received_minor: number | null
          received_per_day_minor: number | null
          savings_rate_percent: number | null
          spent_minor: number | null
          spent_per_day_minor: number | null
          starts_on: string | null
          term_id: string | null
          total_days: number | null
          user_id: string | null
        }
        Relationships: []
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
          note: string | null
          obligation_id: string | null
          occurred_on: string | null
          receipt_path: string | null
          tags: string[] | null
          term_id: string | null
          term_name: string | null
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
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_spend_by_term"
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
      apply_split_template: {
        Args: { p_entry_id: string; p_tx_id: string; p_user_id: string }
        Returns: number
      }
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
      due_reminders: {
        Args: { p_days?: number }
        Returns: {
          amount_minor: number
          due_on: string
          kind: string
          title: string
          user_id: string
        }[]
      }
      get_shared_snapshot: {
        Args: { p_token: string }
        Returns: {
          actual_daily_minor: number
          days_remaining: number
          found: boolean
          money_left_minor: number
          next_due_days_until_due: number
          next_due_is_past_due: boolean
          next_due_remaining_usd_minor: number
          next_due_title: string
          safe_daily_minor: number
          term_name: string
        }[]
      }
      post_due_recurring_entries: { Args: never; Returns: number }
      post_recurring_entry_now: { Args: { p_id: string }; Returns: Json }
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
