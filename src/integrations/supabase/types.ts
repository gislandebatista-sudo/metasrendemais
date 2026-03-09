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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      employee_monthly_bonus: {
        Row: {
          bonus_description: string | null
          created_at: string
          employee_id: string
          id: string
          last_modified_by: string | null
          month: string
          performance_bonus: number
          updated_at: string
        }
        Insert: {
          bonus_description?: string | null
          created_at?: string
          employee_id: string
          id?: string
          last_modified_by?: string | null
          month: string
          performance_bonus?: number
          updated_at?: string
        }
        Update: {
          bonus_description?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          last_modified_by?: string | null
          month?: string
          performance_bonus?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_monthly_bonus_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_monthly_bonus_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bonus_description: string | null
          created_at: string
          created_by: string | null
          id: string
          last_modified_by: string | null
          name: string
          performance_bonus: number
          photo: string | null
          reference_month: string
          role: string
          sector: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bonus_description?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_modified_by?: string | null
          name: string
          performance_bonus?: number
          photo?: string | null
          reference_month: string
          role: string
          sector: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bonus_description?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_modified_by?: string | null
          name?: string
          performance_bonus?: number
          photo?: string | null
          reference_month?: string
          role?: string
          sector?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evaluation_months: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          is_published: boolean
          month: string
          opened_at: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          month: string
          opened_at?: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          month?: string
          opened_at?: string
          status?: string
        }
        Relationships: []
      }
      goal_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          goal_id: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          goal_id: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          goal_id?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_attachments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          goal_id: string
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          goal_id: string
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_checklist_items_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_monthly_progress: {
        Row: {
          achieved: number
          created_at: string
          delivery_date: string | null
          goal_deadline: string | null
          goal_description: string | null
          goal_id: string
          goal_name: string | null
          goal_type: string | null
          goal_weight: number | null
          id: string
          is_deleted: boolean
          last_modified_by: string | null
          month: string
          observations: string | null
          updated_at: string
        }
        Insert: {
          achieved?: number
          created_at?: string
          delivery_date?: string | null
          goal_deadline?: string | null
          goal_description?: string | null
          goal_id: string
          goal_name?: string | null
          goal_type?: string | null
          goal_weight?: number | null
          id?: string
          is_deleted?: boolean
          last_modified_by?: string | null
          month: string
          observations?: string | null
          updated_at?: string
        }
        Update: {
          achieved?: number
          created_at?: string
          delivery_date?: string | null
          goal_deadline?: string | null
          goal_description?: string | null
          goal_id?: string
          goal_name?: string | null
          goal_type?: string | null
          goal_weight?: number | null
          id?: string
          is_deleted?: boolean
          last_modified_by?: string | null
          month?: string
          observations?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_monthly_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved: number
          created_at: string
          deadline: string
          delivery_date: string | null
          description: string | null
          employee_id: string
          goal_type: string
          id: string
          last_modified_by: string | null
          name: string
          observations: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          achieved?: number
          created_at?: string
          deadline: string
          delivery_date?: string | null
          description?: string | null
          employee_id: string
          goal_type: string
          id?: string
          last_modified_by?: string | null
          name: string
          observations?: string | null
          updated_at?: string
          weight: number
        }
        Update: {
          achieved?: number
          created_at?: string
          deadline?: string
          delivery_date?: string | null
          description?: string | null
          employee_id?: string
          goal_type?: string
          id?: string
          last_modified_by?: string | null
          name?: string
          observations?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      employees_secure: {
        Row: {
          bonus_description: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          last_modified_by: string | null
          name: string | null
          performance_bonus: number | null
          photo: string | null
          reference_month: string | null
          role: string | null
          sector: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_description?: never
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          last_modified_by?: string | null
          name?: string | null
          performance_bonus?: never
          photo?: string | null
          reference_month?: string | null
          role?: string | null
          sector?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus_description?: never
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          last_modified_by?: string | null
          name?: string | null
          performance_bonus?: never
          photo?: string | null
          reference_month?: string | null
          role?: string | null
          sector?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_employee_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_my_ranking_position: {
        Args: { target_month: string }
        Returns: {
          my_score: number
          rank_position: number
          total_participants: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_month: { Args: { target_month: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_colaborador: { Args: never; Returns: boolean }
      is_month_published: { Args: { target_month: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "viewer" | "colaborador"
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
    Enums: {
      app_role: ["admin", "viewer", "colaborador"],
    },
  },
} as const
