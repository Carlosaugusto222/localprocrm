// Meta WhatsApp Cloud API webhook.
// GET: verification handshake.
// POST: verify HMAC signature, ingest the message, run the AI agent.

import { createFileRoute } from "@tanstack/react-router";

const enc = new TextEncoder();

async function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
  if (!signatureHeader) return false;
  const expectedHex = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const key = await crypto.subtle.importKey("raw", enc.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (computed.length !== expectedHex.length) return false;
  // timing-safe compare
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/wa/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode !== "subscribe" || !token || !challenge) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("wa_channels").select("id").eq("verify_token", token).limit(1).maybeSingle();
        if (!data) return new Response("Forbidden", { status: 403 });
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      },

      POST: async ({ request }) => {
        const rawBody = await request.text();
        let payload: any;
        try { payload = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const sb = supabaseAdmin;

        const entries = payload?.entry ?? [];
        for (const entry of entries) {
          for (const change of entry?.changes ?? []) {
            const value = change?.value;
            const phoneNumberId = value?.metadata?.phone_number_id as string | undefined;
            if (!phoneNumberId) continue;

            const { data: channel } = await sb
              .from("wa_channels")
              .select("id,organization_id,phone_number_id,access_token,app_secret,verify_token,enabled,auto_reply,system_prompt,escalation_keywords")
              .eq("phone_number_id", phoneNumberId)
              .maybeSingle();
            if (!channel) continue;

            const ok = await verifySignature(rawBody, request.headers.get("x-hub-signature-256"), channel.app_secret);
            if (!ok) return new Response("Invalid signature", { status: 401 });

            const messages = value?.messages ?? [];
            const contacts = value?.contacts ?? [];

            for (const msg of messages) {
              const fromPhone = msg?.from as string;
              const waName = contacts?.find((c: any) => c?.wa_id === fromPhone)?.profile?.name ?? null;
              const text = msg?.text?.body ?? msg?.button?.text ?? msg?.interactive?.button_reply?.title ?? null;
              const wa_message_id = msg?.id ?? null;
              const type = (msg?.type as string) ?? "text";

              // Upsert conversation
              let { data: conv } = await sb
                .from("wa_conversations")
                .select("id,status")
                .eq("channel_id", channel.id)
                .eq("wa_phone", fromPhone)
                .maybeSingle();
              if (!conv) {
                const { data: created } = await sb.from("wa_conversations").insert({
                  organization_id: channel.organization_id,
                  channel_id: channel.id,
                  wa_phone: fromPhone,
                  wa_name: waName,
                  last_message_at: new Date().toISOString(),
                  unread_count: 1,
                }).select("id,status").single();
                conv = created!;
              } else {
                await sb.from("wa_conversations").update({
                  last_message_at: new Date().toISOString(),
                  unread_count: 1, // simple increment-ish (best-effort)
                  wa_name: waName ?? undefined,
                }).eq("id", conv.id);
              }

              await sb.from("wa_messages").insert({
                organization_id: channel.organization_id,
                conversation_id: conv.id,
                direction: "in",
                type,
                text,
                wa_message_id,
              });

              // Run agent only if enabled and conversation is in bot mode
              if (channel.enabled && channel.auto_reply && conv.status === "bot" && text) {
                const { runWhatsAppAgent } = await import("@/lib/wa-agent.server");
                // Fire and forget — don't block webhook response.
                runWhatsAppAgent({
                  organizationId: channel.organization_id,
                  conversationId: conv.id,
                  channel: {
                    id: channel.id,
                    phone_number_id: channel.phone_number_id,
                    access_token: channel.access_token,
                    system_prompt: channel.system_prompt,
                    escalation_keywords: channel.escalation_keywords ?? [],
                  },
                  customerPhone: fromPhone,
                  customerText: text,
                }).catch(err => console.error("[wa-agent]", err));
              }
            }
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
