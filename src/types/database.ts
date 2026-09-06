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
      active_sessions: {
        Row: {
          created_at: string
          details_json: Json
          id: string
          mode_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details_json?: Json
          id?: string
          mode_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details_json?: Json
          id?: string
          mode_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          status: Database["public"]["Enums"]["check_in_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          status?: Database["public"]["Enums"]["check_in_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          status?: Database["public"]["Enums"]["check_in_status"]
          user_id?: string
        }
        Relationships: []
      }
      circle_invitations: {
        Row: {
          accepted_by: string | null
          created_at: string
          id: string
          invited_by: string
          invited_name: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string
          id?: string
          invited_by: string
          invited_name?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_by?: string | null
          created_at?: string
          id?: string
          invited_by?: string
          invited_name?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      circle_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      date_sessions: {
        Row: {
          check_in_interval: number
          created_at: string
          ended_at: string | null
          id: string
          location: string
          location_lat: number | null
          location_lng: number | null
          meeting_name: string
          notes: string | null
          safety_events: Json
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_interval?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          meeting_name: string
          notes?: string | null
          safety_events?: Json
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_interval?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          meeting_name?: string
          notes?: string | null
          safety_events?: Json
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          organization_id: string
          outcome: Database["public"]["Enums"]["incident_outcome"] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          outcome?: Database["public"]["Enums"]["incident_outcome"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          outcome?: Database["public"]["Enums"]["incident_outcome"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "professional_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_sessions: {
        Row: {
          check_in_interval: number
          created_at: string
          ended_at: string | null
          id: string
          item_name: string
          location: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          price: string | null
          proxy_notes: string | null
          proxy_requested: boolean
          safety_events: Json
          seller_name: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_interval?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          item_name: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          price?: string | null
          proxy_notes?: string | null
          proxy_requested?: boolean
          safety_events?: Json
          seller_name?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_interval?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          item_name?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          price?: string | null
          proxy_notes?: string | null
          proxy_requested?: boolean
          safety_events?: Json
          seller_name?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      org_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          business_hours_end: number
          business_hours_start: number
          created_at: string
          id: string
          license_number: string
          logo_url: string
          name: string
          phone: string
          subscription_tier: string
          timezone: string
          website: string
        }
        Insert: {
          business_hours_end?: number
          business_hours_start?: number
          created_at?: string
          id?: string
          license_number?: string
          logo_url?: string
          name: string
          phone?: string
          subscription_tier?: string
          timezone?: string
          website?: string
        }
        Update: {
          business_hours_end?: number
          business_hours_start?: number
          created_at?: string
          id?: string
          license_number?: string
          logo_url?: string
          name?: string
          phone?: string
          subscription_tier?: string
          timezone?: string
          website?: string
        }
        Relationships: []
      }
      professional_sessions: {
        Row: {
          activity_type: Database["public"]["Enums"]["session_activity"]
          actual_end_time: string | null
          address: string
          client_name: string
          created_at: string
          expected_end_time: string
          geofence_armed_at: string | null
          geofence_lat: number | null
          geofence_lng: number | null
          geofence_radius_m: number
          id: string
          notes: string | null
          organization_id: string | null
          property_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["professional_session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["session_activity"]
          actual_end_time?: string | null
          address?: string
          client_name: string
          created_at?: string
          expected_end_time: string
          geofence_armed_at?: string | null
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_radius_m?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          property_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["professional_session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["session_activity"]
          actual_end_time?: string | null
          address?: string
          client_name?: string
          created_at?: string
          expected_end_time?: string
          geofence_armed_at?: string | null
          geofence_lat?: number | null
          geofence_lng?: number | null
          geofence_radius_m?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          property_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["professional_session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_sessions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          duress_pin_hash: string | null
          full_name: string | null
          id: string
          job_description: string | null
          job_title: string | null
          organization_id: string | null
          phone: string | null
          safe_word: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          duress_pin_hash?: string | null
          full_name?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          safe_word?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          duress_pin_hash?: string | null
          full_name?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          safe_word?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          access_notes: string
          address_line1: string
          address_line2: string
          baths: number | null
          beds: number | null
          city: string
          created_at: string
          created_by: string
          geofence_radius_m: number
          id: string
          image_url: string
          lat: number | null
          list_price: number | null
          lng: number | null
          mls_number: string
          organization_id: string
          postal_code: string
          seller_email: string
          seller_name: string
          share_enabled: boolean
          share_expires_at: string | null
          share_include_upcoming: boolean
          share_token: string
          sqft: number | null
          state: string
          status: Database["public"]["Enums"]["property_status"]
          updated_at: string
        }
        Insert: {
          access_notes?: string
          address_line1: string
          address_line2?: string
          baths?: number | null
          beds?: number | null
          city?: string
          created_at?: string
          created_by: string
          geofence_radius_m?: number
          id?: string
          image_url?: string
          lat?: number | null
          list_price?: number | null
          lng?: number | null
          mls_number?: string
          organization_id: string
          postal_code?: string
          seller_email?: string
          seller_name?: string
          share_enabled?: boolean
          share_expires_at?: string | null
          share_include_upcoming?: boolean
          share_token?: string
          sqft?: number | null
          state?: string
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
        }
        Update: {
          access_notes?: string
          address_line1?: string
          address_line2?: string
          baths?: number | null
          beds?: number | null
          city?: string
          created_at?: string
          created_by?: string
          geofence_radius_m?: number
          id?: string
          image_url?: string
          lat?: number | null
          list_price?: number | null
          lng?: number | null
          mls_number?: string
          organization_id?: string
          postal_code?: string
          seller_email?: string
          seller_name?: string
          share_enabled?: boolean
          share_expires_at?: string | null
          share_include_upcoming?: boolean
          share_token?: string
          sqft?: number | null
          state?: string
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          property_id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          property_id: string
          role?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          property_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_spaces: {
        Row: {
          address: string
          business_name: string | null
          business_phone: string | null
          business_website: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_business: boolean
          lat: number
          lng: number
          name: string
          submitted_by: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          address?: string
          business_name?: string | null
          business_phone?: string | null
          business_website?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_business?: boolean
          lat: number
          lng: number
          name: string
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address?: string
          business_name?: string | null
          business_phone?: string | null
          business_website?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_business?: boolean
          lat?: number
          lng?: number
          name?: string
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      showings: {
        Row: {
          activity_type: Database["public"]["Enums"]["session_activity"]
          actual_end: string | null
          actual_start: string | null
          agent_display_name: string
          agent_id: string | null
          buyer_agent_brokerage: string
          buyer_name: string
          cancelled_reason: string
          created_at: string
          created_by: string
          feedback: string
          id: string
          notes: string
          organization_id: string
          property_id: string
          scheduled_end: string
          scheduled_start: string
          session_id: string | null
          status: Database["public"]["Enums"]["showing_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["session_activity"]
          actual_end?: string | null
          actual_start?: string | null
          agent_display_name?: string
          agent_id?: string | null
          buyer_agent_brokerage?: string
          buyer_name?: string
          cancelled_reason?: string
          created_at?: string
          created_by: string
          feedback?: string
          id?: string
          notes?: string
          organization_id: string
          property_id: string
          scheduled_end: string
          scheduled_start: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["showing_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["session_activity"]
          actual_end?: string | null
          actual_start?: string | null
          agent_display_name?: string
          agent_id?: string | null
          buyer_agent_brokerage?: string
          buyer_name?: string
          cancelled_reason?: string
          created_at?: string
          created_by?: string
          feedback?: string
          id?: string
          notes?: string
          organization_id?: string
          property_id?: string
          scheduled_end?: string
          scheduled_start?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["showing_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "professional_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_contacts: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          name: string
          phone: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          last_updated: string
          lat: number
          lng: number
          user_id: string
        }
        Insert: {
          last_updated?: string
          lat?: number
          lng?: number
          user_id: string
        }
        Update: {
          last_updated?: string
          lat?: number
          lng?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      walk_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          destination: string
          duration_seconds: number
          expected_end_at: string
          id: string
          share_token: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          destination?: string
          duration_seconds?: number
          expected_end_at?: string
          id?: string
          share_token?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          destination?: string
          duration_seconds?: number
          expected_end_at?: string
          id?: string
          share_token?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_circle_invite: { Args: { _token: string }; Returns: boolean }
      get_property_showing_record: { Args: { _token: string }; Returns: Json }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      start_adhoc_showing_session: {
        Args: {
          _activity_type?: Database["public"]["Enums"]["session_activity"]
          _client_name?: string
          _duration_min?: number
          _property_id: string
        }
        Returns: string
      }
      start_showing_session: { Args: { _showing_id: string }; Returns: string }
    }
    Enums: {
      app_role: "user" | "admin" | "security_guard" | "manager"
      check_in_status: "idle" | "active" | "emergency"
      incident_outcome:
        | "false_alarm"
        | "user_safe"
        | "emergency_services_called"
        | "test"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_status: "new" | "acknowledged" | "resolved"
      invitation_status: "pending" | "accepted" | "expired"
      professional_session_status:
        | "active"
        | "completed"
        | "extended"
        | "duress_alert"
        | "expired"
      property_status:
        | "active"
        | "pending"
        | "sold"
        | "off_market"
        | "withdrawn"
      session_activity:
        | "showing"
        | "open_house"
        | "appraisal"
        | "client_meeting"
        | "inspection"
        | "listing_appointment"
        | "other"
      showing_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "admin", "security_guard", "manager"],
      check_in_status: ["idle", "active", "emergency"],
      incident_outcome: [
        "false_alarm",
        "user_safe",
        "emergency_services_called",
        "test",
      ],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_status: ["new", "acknowledged", "resolved"],
      invitation_status: ["pending", "accepted", "expired"],
      professional_session_status: [
        "active",
        "completed",
        "extended",
        "duress_alert",
        "expired",
      ],
      property_status: ["active", "pending", "sold", "off_market", "withdrawn"],
      session_activity: [
        "showing",
        "open_house",
        "appraisal",
        "client_meeting",
        "inspection",
        "listing_appointment",
        "other",
      ],
      showing_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
    },
  },
} as const
