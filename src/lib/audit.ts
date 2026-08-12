import { supabase } from "@/integrations/supabase/client";

export async function logAudit(opts: {
  orgId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  payload?: any;
}) {
  const { error } = await supabase.from("audit_log").insert({
    organization_id: opts.orgId,
    user_id: opts.userId,
    action: opts.action,
    entity: opts.entity,
    entity_id: opts.entityId,
    payload: opts.payload,
  });
  if (error) console.error("Audit log error:", error);
}
