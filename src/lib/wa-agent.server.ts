// WhatsApp AI agent — runs only on server.
// Builds context from the org and replies via Gemini through Lovable AI Gateway,
// then sends the reply via Meta Graph API.

import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GRAPH_VERSION = "v21.0";

export async function sendWhatsAppText(opts: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}): Promise<{ wa_message_id?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${opts.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "text",
        text: { body: opts.text.slice(0, 4000) },
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { error: json?.error?.message || `HTTP ${res.status}` };
    return { wa_message_id: json?.messages?.[0]?.id };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

async function loadAgentContext(organizationId: string) {
  const sb = supabaseAdmin;
  const [org, prods, hours] = await Promise.all([
    sb.from("organizations").select("name,segment").eq("id", organizationId).maybeSingle(),
    sb.from("products").select("name,kind,price,duration_minutes").eq("organization_id", organizationId).limit(40),
    sb.from("business_hours").select("weekday,open_time,close_time,closed").eq("organization_id", organizationId),
  ]);
  return {
    name: org.data?.name ?? "nossa empresa",
    segment: org.data?.segment ?? null,
    catalog: prods.data ?? [],
    hours: hours.data ?? [],
  };
}

async function loadRecentMessages(conversationId: string, limit = 10) {
  const { data } = await supabaseAdmin
    .from("wa_messages")
    .select("direction,text,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

export async function runWhatsAppAgent(args: {
  organizationId: string;
  conversationId: string;
  channel: { id: string; phone_number_id: string; access_token: string; system_prompt: string | null; escalation_keywords: string[] };
  customerPhone: string;
  customerText: string;
}): Promise<{ replied: boolean; text?: string; error?: string; escalated?: boolean }> {
  const sb = supabaseAdmin;

  // Escalation by keyword
  const lower = args.customerText.toLowerCase();
  const escalated = args.channel.escalation_keywords?.some(k => k && lower.includes(k.toLowerCase()));
  if (escalated) {
    await sb.from("wa_conversations").update({ status: "human" }).eq("id", args.conversationId);
    const text = "Entendido! Vou chamar um atendente humano para te ajudar. Em instantes alguém responde por aqui. 🙋";
    const send = await sendWhatsAppText({ phoneNumberId: args.channel.phone_number_id, accessToken: args.channel.access_token, to: args.customerPhone, text });
    await sb.from("wa_messages").insert({
      organization_id: args.organizationId, conversation_id: args.conversationId,
      direction: "out", type: "text", text, ai_used: true, wa_message_id: send.wa_message_id, error: send.error,
    });
    return { replied: true, text, escalated: true };
  }

  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { replied: false, error: "Missing LOVABLE_API_KEY" };

  const ctx = await loadAgentContext(args.organizationId);
  const history = await loadRecentMessages(args.conversationId, 10);

  const catalogText = ctx.catalog.length
    ? ctx.catalog.map((p: any) => `- ${p.name} (${p.kind === "service" ? "serviço" : "produto"}) — R$ ${Number(p.price ?? 0).toFixed(2)}${p.duration_minutes ? ` · ${p.duration_minutes}min` : ""}`).join("\n")
    : "(catálogo ainda não cadastrado)";

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hoursText = ctx.hours.length
    ? ctx.hours.map((h: any) => `${weekdays[h.weekday] ?? h.weekday}: ${h.closed ? "fechado" : `${h.open_time?.slice(0,5)}–${h.close_time?.slice(0,5)}`}`).join(" · ")
    : "(horário de funcionamento não configurado)";

  const systemPrompt = args.channel.system_prompt?.trim() || `Você é o atendente virtual da empresa "${ctx.name}".
Responda em português, curto e cordial. Use no máximo 3 parágrafos. Use emojis com moderação.
Apresente-se na primeira interação. Tire dúvidas sobre serviços, preços e horários com base no contexto abaixo.
Se o cliente quiser agendar, peça nome, dia e horário desejado e diga que vai confirmar em seguida (um humano confirmará).
Se a pergunta sair do escopo (reclamação, valores especiais, urgência) diga que vai chamar um atendente humano.

EMPRESA: ${ctx.name}${ctx.segment ? ` (segmento: ${ctx.segment})` : ""}
HORÁRIO DE FUNCIONAMENTO: ${hoursText}
CATÁLOGO:
${catalogText}`;

  const messages = [
    ...history.map(m => ({ role: m.direction === "in" ? "user" as const : "assistant" as const, content: m.text ?? "" })),
    { role: "user" as const, content: args.customerText },
  ];

  try {
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: systemPrompt,
      messages,
    });
    const reply = (text ?? "").trim() || "Recebi sua mensagem! Em instantes te respondo. 🙏";
    const send = await sendWhatsAppText({ phoneNumberId: args.channel.phone_number_id, accessToken: args.channel.access_token, to: args.customerPhone, text: reply });
    await sb.from("wa_messages").insert({
      organization_id: args.organizationId, conversation_id: args.conversationId,
      direction: "out", type: "text", text: reply, ai_used: true, wa_message_id: send.wa_message_id, error: send.error,
    });
    return { replied: true, text: reply, error: send.error };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    await sb.from("wa_messages").insert({
      organization_id: args.organizationId, conversation_id: args.conversationId,
      direction: "out", type: "text", text: null, ai_used: true, error: msg,
    });
    return { replied: false, error: msg };
  }
}
