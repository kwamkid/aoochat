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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          assigned_at: string | null
          assigned_team_id: string | null
          assigned_to: string | null
          channel_type: string | null
          created_at: string | null
          custom_fields: Json | null
          customer_id: string | null
          first_response_at: string | null
          id: string
          is_archived: boolean | null
          is_spam: boolean | null
          last_message_at: string | null
          message_count: number | null
          organization_id: string | null
          platform: string
          platform_account_id: string | null
          platform_conversation_id: string | null
          priority: string | null
          resolution_time: unknown | null
          resolved_at: string | null
          sla_deadline: string | null
          status: string | null
          subject: string | null
          tags: string[] | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_team_id?: string | null
          assigned_to?: string | null
          channel_type?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_spam?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          organization_id?: string | null
          platform: string
          platform_account_id?: string | null
          platform_conversation_id?: string | null
          priority?: string | null
          resolution_time?: unknown | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_team_id?: string | null
          assigned_to?: string | null
          channel_type?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_spam?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          organization_id?: string | null
          platform?: string
          platform_account_id?: string | null
          platform_conversation_id?: string | null
          priority?: string | null
          resolution_time?: unknown | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          abandoned_carts: number | null
          avatar_url: string | null
          avg_order_value: number | null
          avg_response_time: unknown | null
          birth_date: string | null
          churn_risk_score: number | null
          city: string | null
          country: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          engagement_score: number | null
          first_contact_at: string | null
          first_purchase_at: string | null
          gender: string | null
          id: string
          influencer_score: number | null
          is_deleted: boolean | null
          language: string | null
          last_contact_at: string | null
          last_purchase_at: string | null
          lifetime_value: number | null
          merged_with: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          platform_identities: Json | null
          preferred_contact_time: Json | null
          preferred_platform: string | null
          purchase_intent_score: number | null
          satisfaction_score: number | null
          timezone: string | null
          total_conversations: number | null
          total_messages: number | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          abandoned_carts?: number | null
          avatar_url?: string | null
          avg_order_value?: number | null
          avg_response_time?: unknown | null
          birth_date?: string | null
          churn_risk_score?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          engagement_score?: number | null
          first_contact_at?: string | null
          first_purchase_at?: string | null
          gender?: string | null
          id?: string
          influencer_score?: number | null
          is_deleted?: boolean | null
          language?: string | null
          last_contact_at?: string | null
          last_purchase_at?: string | null
          lifetime_value?: number | null
          merged_with?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          platform_identities?: Json | null
          preferred_contact_time?: Json | null
          preferred_platform?: string | null
          purchase_intent_score?: number | null
          satisfaction_score?: number | null
          timezone?: string | null
          total_conversations?: number | null
          total_messages?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          abandoned_carts?: number | null
          avatar_url?: string | null
          avg_order_value?: number | null
          avg_response_time?: unknown | null
          birth_date?: string | null
          churn_risk_score?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          engagement_score?: number | null
          first_contact_at?: string | null
          first_purchase_at?: string | null
          gender?: string | null
          id?: string
          influencer_score?: number | null
          is_deleted?: boolean | null
          language?: string | null
          last_contact_at?: string | null
          last_purchase_at?: string | null
          lifetime_value?: number | null
          merged_with?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          platform_identities?: Json | null
          preferred_contact_time?: Json | null
          preferred_platform?: string | null
          purchase_intent_score?: number | null
          satisfaction_score?: number | null
          timezone?: string | null
          total_conversations?: number | null
          total_messages?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_merged_with_fkey"
            columns: ["merged_with"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          is_automated: boolean | null
          is_private: boolean | null
          language: string | null
          message_type: string | null
          platform_message_id: string | null
          read_at: string | null
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          sentiment: string | null
          status: string | null
          translated_content: Json | null
          updated_at: string | null
        }
        Insert: {
          content: Json
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          is_automated?: boolean | null
          is_private?: boolean | null
          language?: string | null
          message_type?: string | null
          platform_message_id?: string | null
          read_at?: string | null
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
          sentiment?: string | null
          status?: string | null
          translated_content?: Json | null
          updated_at?: string | null
        }
        Update: {
          content?: Json
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          is_automated?: boolean | null
          is_private?: boolean | null
          language?: string | null
          message_type?: string | null
          platform_message_id?: string | null
          read_at?: string | null
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          sentiment?: string | null
          status?: string | null
          translated_content?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          settings: Json | null
          size: string | null
          slug: string
          subscription_expires_at: string | null
          subscription_plan: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          size?: string | null
          slug: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          size?: string | null
          slug?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      platform_accounts: {
        Row: {
          access_token: string | null
          account_avatar: string | null
          account_id: string | null
          account_name: string | null
          account_username: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          metadata: Json | null
          organization_id: string | null
          permissions: Json | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          account_avatar?: string | null
          account_id?: string | null
          account_name?: string | null
          account_username?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          permissions?: Json | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          account_avatar?: string | null
          account_id?: string | null
          account_name?: string | null
          account_username?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          permissions?: Json | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string | null
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          manager_id: string | null
          name: string
          organization_id: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          organization_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          organization_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          language: string | null
          last_active_at: string | null
          name: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          settings: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean | null
          language?: string | null
          last_active_at?: string | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_active_at?: string | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
