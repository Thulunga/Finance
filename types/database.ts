export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
          user_code: string;
          user_id: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
          user_code: string;
          user_id: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
          user_code?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      income_entries: {
        Row: {
          amount: number;
          created_at: string | null;
          date: string;
          description: string;
          id: string;
          month_year: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          date?: string;
          description: string;
          id?: string;
          month_year: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          date?: string;
          description?: string;
          id?: string;
          month_year?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cash_allocations: {
        Row: {
          allocation_type: "investment" | "emergency_fund";
          amount: number;
          created_at: string | null;
          date: string;
          description: string;
          id: string;
          month_year: string;
          user_id: string;
        };
        Insert: {
          allocation_type: "investment" | "emergency_fund";
          amount: number;
          created_at?: string | null;
          date?: string;
          description: string;
          id?: string;
          month_year: string;
          user_id: string;
        };
        Update: {
          allocation_type?: "investment" | "emergency_fund";
          amount?: number;
          created_at?: string | null;
          date?: string;
          description?: string;
          id?: string;
          month_year?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          allocated_amount: number;
          category: string;
          created_at: string | null;
          id: string;
          month_year: string;
          user_id: string | null;
        };
        Insert: {
          allocated_amount?: number;
          category: string;
          created_at?: string | null;
          id?: string;
          month_year: string;
          user_id?: string | null;
        };
        Update: {
          allocated_amount?: number;
          category?: string;
          created_at?: string | null;
          id?: string;
          month_year?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          category: string;
          created_at: string | null;
          date: string;
          description: string;
          id: string;
          is_shared: boolean;
          is_credit_card: boolean;
          is_credit_card_payment: boolean;
          my_share: number;
          total_amount: number;
          user_id: string | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          date?: string;
          description: string;
          id?: string;
          is_shared?: boolean;
          is_credit_card?: boolean;
          is_credit_card_payment?: boolean;
          my_share: number;
          total_amount: number;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          date?: string;
          description?: string;
          id?: string;
          is_shared?: boolean;
          is_credit_card?: boolean;
          is_credit_card_payment?: boolean;
          my_share?: number;
          total_amount?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      split_receivables: {
        Row: {
          amount_owed: number;
          created_at: string | null;
          expense_id: string | null;
          friend_name: string;
          id: string;
          is_settled: boolean;
          settled_date: string | null;
        };
        Insert: {
          amount_owed: number;
          created_at?: string | null;
          expense_id?: string | null;
          friend_name: string;
          id?: string;
          is_settled?: boolean;
          settled_date?: string | null;
        };
        Update: {
          amount_owed?: number;
          created_at?: string | null;
          expense_id?: string | null;
          friend_name?: string;
          id?: string;
          is_settled?: boolean;
          settled_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "split_receivables_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends { Row: infer Row }
      ? Row
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer Insert;
    }
    ? Insert
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer Insert;
      }
      ? Insert
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer Update;
    }
    ? Update
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer Update;
      }
      ? Update
      : never
    : never;