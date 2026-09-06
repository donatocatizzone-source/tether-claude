import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Property } from "@/lib/showings";

// The properties this agent is assigned to, via property_assignments.
// Replaces TeamMemberView's MOCK_PROPERTIES (three hardcoded Unsplash cards).

export interface MyProperties {
  properties: Property[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMyProperties(userId: string | undefined): MyProperties {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    if (!userId) {
      setProperties([]);
      setLoading(false);
      return;
    }

    // Read through the join table so this returns only assigned properties,
    // even though RLS would allow reading every property in the org (agents
    // need org-wide visibility to cover for each other — see the migration).
    const { data, error: err } = await supabase
      .from("property_assignments")
      .select("property:properties(*)")
      .eq("user_id", userId);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? [])
      .map((r) => (r as { property: Property | null }).property)
      .filter((p): p is Property => p !== null)
      // Active listings first, then most recently added.
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return b.created_at.localeCompare(a.created_at);
      });

    setError(null);
    setProperties(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchProperties();
  }, [fetchProperties]);

  return { properties, loading, error, refresh: fetchProperties };
}
