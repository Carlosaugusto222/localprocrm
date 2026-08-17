
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { logAudit } from "@/lib/audit";


export const suggestWaReply = createServerFn({ method: "POST" })
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

    // 2. Get org & services context
    const { data: org } = await context.supabase.from("organizations").select("*").eq("id", data.organizationId).single();
    const { data: services } = await context.supabase.from("products").select("name,price").eq("organization_id", data.organizationId).eq("kind", "service");

    const history = messages.reverse().map(m => `${m.direction === 'in' ? 'Cliente' : 'Atendente'}: ${m.text}`).join('\n');
    
    const systemPrompt = `Você é o assistente IA do LocalPro CRM ajudando um atendente da empresa ${org?.name || 'LocalPro'}.
Analise o histórico de conversa e sugira uma resposta curta, educada e prestativa para o atendente enviar via WhatsApp.
Contexto da empresa: ${org?.segment || 'Negócio local'}.
Serviços: ${services?.map(s => `${s.name} (R$ ${s.price})`).join(', ') || 'Consultar'}.

Regras:
1. Responda apenas com a sugestão de mensagem, sem aspas ou explicações.
2. Use um tom amigável e emojis.
3. Se o cliente perguntar preço ou agendamento, use os dados acima.
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
          services_count: services?.length
        }
      }
    });

    return { suggestion: suggestion.trim() };

  });
