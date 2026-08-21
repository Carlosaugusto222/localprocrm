
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { logAudit } from "@/lib/audit";


export const suggestWaReplyAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    organizationId: z.string().uuid(),
    conversationId: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    // 1. Get conversation history
    const { data: messages } = await context.supabase
      .from("wa_messages")
      .select("direction,text,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!messages || messages.length === 0) return { suggestion: "" };

    // 2. Get org & services context & channel settings
    const { data: channel } = await context.supabase.from("wa_channels").select("*").eq("organization_id", data.organizationId).single();
    const { data: org } = await context.supabase.from("organizations").select("*").eq("id", data.organizationId).single();
    const { data: services } = await context.supabase.from("products").select("name,price").eq("organization_id", data.organizationId).eq("kind", "service");

    const history = messages.reverse().map(m => `${m.direction === 'in' ? 'Cliente' : 'Atendente'}: ${m.text}`).join('\n');
    
    const settingsBlock = `
Tom de Voz: ${channel?.tone_of_voice || 'Profissional e amigável'}
Objetivos: ${channel?.campaign_goals || 'Agendamento e suporte'}
Restrições: ${channel?.ai_restrictions || 'Nenhuma'}
`;

    const systemPrompt = `Você é o assistente IA do LocalPro CRM ajudando um atendente da empresa ${org?.name || 'LocalPro'}.
Analise o histórico de conversa e sugira uma resposta curta, educada e prestativa para o atendente enviar via WhatsApp.
Contexto da empresa: ${org?.segment || 'Negócio local'}.
Serviços: ${services?.map(s => `${s.name} (R$ ${s.price})`).join(', ') || 'Consultar'}.

Regras Personalizadas:
${settingsBlock}

Instruções Gerais:
1. Responda apenas com a sugestão de mensagem, sem aspas ou explicações.
2. Use o tom de voz definido acima.
3. Se o cliente perguntar preço ou agendamento, use os dados acima e respeite as restrições.
4. Máximo 3 linhas.`;

    const { aiGateway } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");

    const { text: suggestion } = await generateText({
      model: aiGateway("gpt-4o-mini"),
      system: systemPrompt,
      prompt: `Histórico da conversa:\n${history}\n\nSugira a próxima resposta para o atendente:`,
    });

    // Log the IA suggestion for audit
    await logAudit({
      orgId: data.organizationId,
      userId: context.userId || "system-ia",
      action: "wa_suggestion",
      entity: "ia_interaction",
      entityId: data.conversationId,
      payload: {
        suggestion: suggestion.trim(),
        history: messages,
        context_used: {
          org: org?.name,
          services_count: services?.length,
          ai_settings: {
            tone: channel?.tone_of_voice,
            goals: channel?.campaign_goals,
            restrictions: channel?.ai_restrictions
          }
        }
      }
    });

    return { suggestion: suggestion.trim() };

  });