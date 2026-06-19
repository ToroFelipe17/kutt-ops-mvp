export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          business_id: string;
          client_id: string | null;
          client_name_snapshot: string | null;
          created_at: string;
          duration_min: number;
          id: string;
          notes: string | null;
          price: number;
          service_id: string | null;
          service_name_snapshot: string | null;
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          updated_at: string;
        };
        Insert: {
          business_id: string;
          client_id?: string | null;
          client_name_snapshot?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          notes?: string | null;
          price?: number;
          service_id?: string | null;
          service_name_snapshot?: string | null;
          staff_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          client_id?: string | null;
          client_name_snapshot?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          notes?: string | null;
          price?: number;
          service_id?: string | null;
          service_name_snapshot?: string | null;
          staff_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          close_hour: number;
          created_at: string;
          currency: string;
          id: string;
          logo_url: string | null;
          name: string;
          onboarded: boolean;
          open_hour: number;
          owner_id: string;
          primary_color: string | null;
          updated_at: string;
        };
        Insert: {
          close_hour?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          onboarded?: boolean;
          open_hour?: number;
          owner_id: string;
          primary_color?: string | null;
          updated_at?: string;
        };
        Update: {
          close_hour?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          onboarded?: boolean;
          open_hour?: number;
          owner_id?: string;
          primary_color?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cash_movements: {
        Row: {
          accounting_date: string;
          amount: number;
          business_id: string;
          concept: string;
          created_at: string;
          id: string;
          kind: string;
        };
        Insert: {
          accounting_date?: string;
          amount: number;
          business_id: string;
          concept: string;
          created_at?: string;
          id?: string;
          kind: string;
        };
        Update: {
          accounting_date?: string;
          amount?: number;
          business_id?: string;
          concept?: string;
          created_at?: string;
          id?: string;
          kind?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          last_visit_at: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          total_spent: number;
          visits_count: number;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          last_visit_at?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          total_spent?: number;
          visits_count?: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          last_visit_at?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          total_spent?: number;
          visits_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_closes: {
        Row: {
          business_id: string;
          cash_counted: number | null;
          cash_diff: number;
          close_date: string;
          closed_by: string | null;
          created_at: string;
          id: string;
          iva_estimated: number;
          notes: string | null;
          profit_estimated: number;
          total_card: number;
          total_cash: number;
          total_commissions: number;
          total_expenses: number;
          total_pending: number;
          total_sales: number;
          total_transfer: number;
        };
        Insert: {
          business_id: string;
          cash_counted?: number | null;
          cash_diff?: number;
          close_date: string;
          closed_by?: string | null;
          created_at?: string;
          id?: string;
          iva_estimated?: number;
          notes?: string | null;
          profit_estimated?: number;
          total_card?: number;
          total_cash?: number;
          total_commissions?: number;
          total_expenses?: number;
          total_pending?: number;
          total_sales?: number;
          total_transfer?: number;
        };
        Update: {
          business_id?: string;
          cash_counted?: number | null;
          cash_diff?: number;
          close_date?: string;
          closed_by?: string | null;
          created_at?: string;
          id?: string;
          iva_estimated?: number;
          notes?: string | null;
          profit_estimated?: number;
          total_card?: number;
          total_cash?: number;
          total_commissions?: number;
          total_expenses?: number;
          total_pending?: number;
          total_sales?: number;
          total_transfer?: number;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          body: string;
          business_id: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["message_kind"];
        };
        Insert: {
          body: string;
          business_id: string;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["message_kind"];
        };
        Update: {
          body?: string;
          business_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
        };
        Relationships: [
          {
            foreignKeyName: "message_templates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          accounting_date: string;
          amount: number;
          appointment_id: string | null;
          business_id: string;
          commission_amount: number | null;
          commission_pct: number | null;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          notes: string | null;
          staff_id: string | null;
          status: Database["public"]["Enums"]["payment_status"];
        };
        Insert: {
          accounting_date?: string;
          amount: number;
          appointment_id?: string | null;
          business_id: string;
          commission_amount?: number | null;
          commission_pct?: number | null;
          created_at?: string;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          notes?: string | null;
          staff_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Update: {
          accounting_date?: string;
          amount?: number;
          appointment_id?: string | null;
          business_id?: string;
          commission_amount?: number | null;
          commission_pct?: number | null;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          notes?: string | null;
          staff_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          default_business_id: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_business_id?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_business_id?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          business_id: string;
          created_at: string;
          duration_min: number;
          id: string;
          name: string;
          price: number;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          created_at?: string;
          duration_min?: number;
          id?: string;
          name: string;
          price?: number;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          created_at?: string;
          duration_min?: number;
          id?: string;
          name?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          business_id: string;
          color: string | null;
          commission_pct: number;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          color?: string | null;
          commission_pct?: number;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          color?: string | null;
          commission_pct?: number;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      user_owns_business: { Args: { _business_id: string }; Returns: boolean };
    };
    Enums: {
      appointment_status:
        | "pendiente"
        | "confirmado"
        | "llego"
        | "pagado"
        | "completado"
        | "cancelado";
      message_kind: "confirmacion" | "recordatorio" | "pago_recibido" | "reagendar";
      payment_method: "efectivo" | "transferencia" | "debito" | "credito";
      payment_status: "pendiente" | "conciliado" | "parcial";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      appointment_status: ["pendiente", "confirmado", "llego", "pagado", "completado", "cancelado"],
      message_kind: ["confirmacion", "recordatorio", "pago_recibido", "reagendar"],
      payment_method: ["efectivo", "transferencia", "debito", "credito"],
      payment_status: ["pendiente", "conciliado", "parcial"],
    },
  },
} as const;
