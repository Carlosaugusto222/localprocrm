// Client-callable server functions for WhatsApp config + inbox.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getWaChannel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ organizationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: ch } = await context.supabase
      .from("wa_channels")
      .select("*")
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    return ch;
  });

const SaveChannelInput = z.object({
  organizationId: z.string().uuid(),
  phone_number_id: z.string().min(3),
  waba_id: z.string().optional().nullable(),
  display_phone_number: z.string().optional().nullable(),
  access_token: z.string().min(10),
  app_secret: z.string().min(8),
  verify_token: z.string().min(8),
  enabled: z.boolean().default(true),
  auto_reply: z.boolean().default(true),
  system_prompt: z.string().optional().nullable(),
  tone_of_voice: z.string().optional().nullable(),
  campaign_goals: z.string().optional().nullable(),
  ai_restrictions: z.string().optional().nullable(),
  escalation_keywords: z.array(z.string()).default([]),
});


export const saveWaChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SaveChannelInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("wa_channels").select("id").eq("organization_id", data.organizationId).maybeSingle();
    const { organizationId, ...rest } = data;
    const payload = { ...rest, organization_id: organizationId };
    if (existing) {
      const { error } = await context.supabase.from("wa_channels").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id };
    }
    const { data: created, error } = await context.supabase.from("wa_channels").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const listWaConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ organizationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("wa_conversations")
      .select("id,wa_phone,wa_name,status,last_message_at,unread_count")
      .eq("organization_id", data.organizationId)
      .order("last_message_at", { ascending: false })
      .limit(100);
    return rows ?? [];
  });

export const listWaMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ conversationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("wa_messages")
      .select("id,direction,text,ai_used,error,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    // mark conversation as read
    await context.supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", data.conversationId);
    return rows ?? [];
  });

export const sendWaReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    organizationId: z.string().uuid(),
    conversationId: z.string().uuid(),
    text: z.string().min(1).max(4000),
  }).parse(data))
  .handler(async ({ data, context }) => {
    // Confirm membership through RLS-backed read
    const { data: conv } = await context.supabase
      .from("wa_conversations")
      .select("id,wa_phone,channel_id,organization_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv || conv.organization_id !== data.organizationId) throw new Error("Conversa não encontrada");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: channel } = await supabaseAdmin
      .from("wa_channels").select("phone_number_id,access_token").eq("id", conv.channel_id).maybeSingle();
    if (!channel) throw new Error("Canal não configurado");

    const { sendWhatsAppText } = await import("@/lib/wa-agent.server");
    const send = await sendWhatsAppText({
      phoneNumberId: channel.phone_number_id,
      accessToken: channel.access_token,
      to: conv.wa_phone,
      text: data.text,
    });
    if (send.error) throw new Error(send.error);

    await context.supabase.from("wa_messages").insert({
      organization_id: data.organizationId,
      conversation_id: data.conversationId,
      direction: "out",
      type: "text",
      text: data.text,
      ai_used: false,
      sent_by: context.userId,
      wa_message_id: send.wa_message_id ?? null,
    });
    return { ok: true };
  });

export const setWaConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    conversationId: z.string().uuid(),
    status: z.enum(["bot", "human", "closed"]),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("wa_conversations")
      .update({ status: data.status, assigned_to: data.status === "human" ? context.userId : null })
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
