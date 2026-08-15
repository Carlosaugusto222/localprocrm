import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { aiGateway } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: any[]; tenant?: any };
        const { messages, tenant } = body;
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const baseSystem = "Você é o assistente IA do LocalPro CRM. Ajude donos de negócios locais (barbearias, clínicas, oficinas, restaurantes, etc.) com mensagens, campanhas, ideias de marketing, retenção de clientes e gestão. Responda sempre em português brasileiro, de forma clara e prática. Use markdown quando apropriado.";
        const tenantBlock = tenant ? `\n\nContexto da empresa do usuário (use para personalizar TODAS as respostas):\n${JSON.stringify(tenant, null, 2)}` : "";
        
        try {
          const result = streamText({
            model: aiGateway("gpt-4o-mini"),
            system: baseSystem + tenantBlock,
            messages: messages, // ai@4+ handles plain messages or convertToCoreMessages
          });
          return result.toTextStreamResponse();
        } catch (e: any) {
          const msg = String(e?.message ?? e);
          if (msg.includes("429")) return new Response("Muitas requisições. Tente novamente em instantes.", { status: 429 });
          if (msg.includes("402")) return new Response("Créditos de IA esgotados. Adicione créditos em Configurações > Plano.", { status: 402 });
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});