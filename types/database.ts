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
      epf_balances: {
        Row: {
          balance: number;
          created_at: string | null;
          id: string;
          note: string | null;
          recorded_at: string;
          user_id: string;
        };
        Insert: {
          balance: number;
          created_at?: string | null;
          id?: string;
          note?: string | null;
          recorded_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string | null;
          id?: string;
          note?: string | null;
          recorded_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fd_accounts: {
        Row: {
          amount: number;
          bank_name: string;
          created_at: string | null;
          id: string;
          interest_rate: number | null;
          maturity_date: string | null;
          note: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          bank_name: string;
          created_at?: string | null;
          id?: string;
          interest_rate?: number | null;
          maturity_date?: string | null;
          note?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          bank_name?: string;
          created_at?: string | null;
          id?: string;
          interest_rate?: number | null;
          maturity_date?: string | null;
          note?: string | null;
          updated_at?: string | null;
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
          friend_user_id: string | null;
          group_id: string | null;
          id: string;
          is_settled: boolean;
          settled_date: string | null;
        };
        Insert: {
          amount_owed: number;
          created_at?: string | null;
          expense_id?: string | null;
          friend_name: string;
          friend_user_id?: string | null;
          group_id?: string | null;
          id?: string;
          is_settled?: boolean;
          settled_date?: string | null;
        };
        Update: {
          amount_owed?: number;
          created_at?: string | null;
          expense_id?: string | null;
          friend_name?: string;
          friend_user_id?: string | null;
          group_id?: string | null;
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
      friendships: {
        Row: {
          created_at: string;
          friend_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          friend_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          friend_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      expense_groups: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      expense_group_members: {
        Row: {
          group_id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      expense_group_invites: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string | null;
          group_id: string;
          id: string;
          revoked: boolean;
          token: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          group_id: string;
          id?: string;
          revoked?: boolean;
          token: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          group_id?: string;
          id?: string;
          revoked?: boolean;
          token?: string;
        };
        Relationships: [];
      };
      split_settlement_history: {
        Row: {
          action: string;
          actor_user_id: string;
          created_at: string;
          id: string;
          split_id: string;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          created_at?: string;
          id?: string;
          split_id: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          created_at?: string;
          id?: string;
          split_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_friend_by_code: {
        Args: { target_code: string };
        Returns: undefined;
      };
      create_expense_group: {
        Args: { group_name: string };
        Returns: Database["public"]["Tables"]["expense_groups"]["Row"];
      };
      add_group_member_by_code: {
        Args: { target_group_id: string; target_code: string };
        Returns: undefined;
      };
      create_group_invite: {
        Args: { target_group_id: string; expires_in_hours?: number | null };
        Returns: Database["public"]["Tables"]["expense_group_invites"]["Row"];
      };
      revoke_group_invite: {
        Args: { target_invite_id: string };
        Returns: undefined;
      };
      join_group_via_token: {
        Args: { invite_token: string };
        Returns: Database["public"]["Tables"]["expense_groups"]["Row"];
      };
      settle_split_as_friend: {
        Args: { target_split_id: string; mark_settled: boolean };
        Returns: Database["public"]["Tables"]["split_receivables"]["Row"];
      };
      list_my_friends: {
        Args: Record<string, never>;
        Returns: { user_id: string; user_code: string; avatar_path: string | null }[];
      };
      list_my_groups: {
        Args: Record<string, never>;
        Returns: {
          group_id: string;
          group_name: string;
          member_count: number;
          is_owner: boolean;
          created_at: string;
        }[];
      };
      list_group_members: {
        Args: { target_group_id: string };
        Returns: {
          user_id: string;
          user_code: string;
          avatar_path: string | null;
          joined_at: string;
        }[];
      };
    };
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