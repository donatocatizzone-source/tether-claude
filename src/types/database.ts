/**
 * Hand-written types mirroring supabase/schema.sql.
 *
 * Once the schema is pushed to a real Supabase project, replace this file by running:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
 */

export type UserRole = "user" | "manager" | "admin";
export type SessionStatus = "active" | "completed" | "extended" | "duress_alert" | "expired";
export type IncidentStatus = "new" | "acknowledged" | "resolved";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type CheckInStatus = "safe" | "missed" | "duress";
export type ModeType = "dating" | "ride" | "marketplace" | "student";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          safe_word: string | null;
          duress_pin_hash: string | null;
          role: UserRole;
          organization_id: string | null;
          default_view: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      trusted_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["trusted_contacts"]["Row"]> & {
          user_id: string;
          name: string;
          phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["trusted_contacts"]["Row"]>;
      };
      check_ins: {
        Row: {
          id: string;
          user_id: string;
          location_lat: number | null;
          location_long: number | null;
          status: CheckInStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["check_ins"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["check_ins"]["Row"]>;
      };
      active_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode_type: ModeType;
          details_json: Record<string, unknown>;
          status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["active_sessions"]["Row"]> & {
          user_id: string;
          mode_type: ModeType;
        };
        Update: Partial<Database["public"]["Tables"]["active_sessions"]["Row"]>;
      };
      professional_sessions: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          client_name: string | null;
          address: string | null;
          notes: string | null;
          start_time: string;
          expected_end_time: string | null;
          status: SessionStatus;
        };
        Insert: Partial<Database["public"]["Tables"]["professional_sessions"]["Row"]> & {
          user_id: string;
          start_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["professional_sessions"]["Row"]>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          subscription_tier: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
      };
      user_locations: {
        Row: {
          user_id: string;
          lat: number;
          lng: number;
          last_updated: string;
        };
        Insert: Database["public"]["Tables"]["user_locations"]["Row"];
        Update: Partial<Database["public"]["Tables"]["user_locations"]["Row"]>;
      };
      incidents: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string;
          session_id: string | null;
          status: IncidentStatus;
          severity: IncidentSeverity;
          resolved_by: string | null;
          resolution_notes: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["incidents"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["incidents"]["Row"]>;
      };
    };
  };
}
