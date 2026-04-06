export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          monthly_income: number | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          monthly_income?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          monthly_income?: number | null
          updated_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          description: string
          amount: number
          date: string
          category: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          date: string
          category: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          date?: string
          category?: string
          user_id?: string
          created_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          title: string
          participants: string[]
          discount: number
          discount_type: 'percentage' | 'fixed'
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          participants: string[]
          discount?: number
          discount_type?: 'percentage' | 'fixed'
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          participants?: string[]
          discount?: number
          discount_type?: 'percentage' | 'fixed'
          user_id?: string
          created_at?: string
        }
      }
      bill_items: {
        Row: {
          id: string
          bill_id: string
          name: string
          price: number
          assigned_to: string[]
          created_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          name: string
          price: number
          assigned_to: string[]
          created_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          name?: string
          price?: number
          assigned_to?: string[]
          created_at?: string
        }
      }
      budget_goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          created_at?: string
        }
      }
      budget_goal_logs: {
        Row: {
          id: string
          goal_id: string
          amount: number
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          amount: number
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          amount?: number
          source?: string | null
          created_at?: string
        }
      }
    }
  }
}
