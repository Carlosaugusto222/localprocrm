import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  segment: string | null;
  plan: "basic" | "pro" | "premium";
  enabled_modules: string[];
  owner_id: string;
};

const STORAGE_KEY = "localpro:current_org";

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async (): Promise<Organization[]> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug,segment,plan,enabled_modules,owner_id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Organization[];
    },
  });
}

export function useCurrentOrg() {
  const { data: orgs, isLoading } = useOrganizations();
  const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const current = orgs?.find(o => o.id === stored) ?? orgs?.[0] ?? null;
  return {
    org: current,
    orgs: orgs ?? [],
    loading: isLoading,
    setCurrent: (id: string) => {
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
      window.location.reload();
    },
  };
}

export function useEnabledModules() {
  const { org } = useCurrentOrg();
  const mods = new Set(org?.enabled_modules ?? []);
  return (name: string) => mods.has(name);
}
