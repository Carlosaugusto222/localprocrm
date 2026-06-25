import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        try {
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: "Você é o assistente IA do LocalPro CRM. Ajude donos de negócios locais (barbearias, clínicas, oficinas, restaurantes, etc.) com mensagens, campanhas, ideias de marketing, retenção de clientes e gestão. Responda sempre em português brasileiro, de forma clara e prática. Use markdown quando apropriado.",
            messages: await convertToModelMessages(messages as UIMessage[]),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages as UIMessage[] });
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
