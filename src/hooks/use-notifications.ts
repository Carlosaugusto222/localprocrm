import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "./use-current-org";

export function useNotifications() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!org?.id,
    queryKey: ["notifications", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!org) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() })
        .eq("organization_id", org.id).is("read_at", null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (query.data ?? []).filter(n => !n.read_at).length;

  return { notifications: query.data ?? [], unread, isLoading: query.isLoading, markRead, markAllRead };
}
