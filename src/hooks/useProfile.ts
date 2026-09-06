import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface ProfileState {
  fullName: string | null;
  organizationId: string | null;
  jobTitle: string;
  roles: AppRole[];
  hasOrganization: boolean;
  /** manager or admin — the gate for the Overwatch console. */
  isManager: boolean;
  loading: boolean;
}

/**
 * The signed-in user's profile + roles, cached with react-query so the
 * several places that need this (route guard, workspace switcher, forms)
 * share one request instead of each issuing their own.
 *
 * Roles come from `user_roles`, never from a column on `profiles` — a user
 * can hold several, and the database checks them through the security-definer
 * has_role(). This hook only decides what UI to show; RLS is still the thing
 * that actually enforces access.
 */
export function useProfile(): ProfileState {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!user) return null;

      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, organization_id, job_title")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      return {
        fullName: profileRes.data?.full_name ?? null,
        organizationId: profileRes.data?.organization_id ?? null,
        jobTitle: profileRes.data?.job_title ?? "",
        roles: (rolesRes.data ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  const roles = data?.roles ?? [];

  return {
    fullName: data?.fullName ?? null,
    organizationId: data?.organizationId ?? null,
    jobTitle: data?.jobTitle ?? "",
    roles,
    hasOrganization: !!data?.organizationId,
    isManager: roles.includes("manager") || roles.includes("admin"),
    loading: isLoading,
  };
}
