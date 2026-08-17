import { supabaseAdmin } from '@/integrations/supabase/client.server';

export async function runWhatsAppAgent({
  organizationId,
  conversationId,
  channel,
  customerPhone,
  customerText,
}: {
  organizationId: string;
  conversationId: string;
  channel: {
    id: string;
    phone_number_id: string;
    access_token: string;
    system_prompt: string | null;
    tone_of_voice: string | null;
    campaign_goals: string | null;
    ai_restrictions: string | null;
    escalation_keywords: string[];
  };

  customerPhone: string;
  customerText: string;
}) {
  // 1. Context: Org & Services
  const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('id', organizationId).single();
  const { data: services } = await supabaseAdmin.from('products').select('*').eq('organization_id', organizationId).eq('kind', 'service');
  
  if (!org) return;

  const settingsBlock = `
Tom de Voz: ${channel.tone_of_voice || 'Profissional e amigável'}
Objetivos: ${channel.campaign_goals || 'Agendar serviços ou tirar dúvidas'}
Restrições: ${channel.ai_restrictions || 'Nenhuma'}
`;

  const systemPrompt = channel.system_prompt || `Você é o atendente virtual da empresa ${org.name}.
Seu objetivo é ser prestativo, educado e seguir as diretrizes da empresa.
Informações da empresa: ${org.address || 'Não informado'}.
Serviços disponíveis: ${services?.map(s => `${s.name} (R$ ${s.price})`).join(', ') || 'Consultar preços'}.

Diretrizes da Empresa:
${settingsBlock}

Regras:
1. Responda de forma curta e objetiva (máximo 3 parágrafos).
2. Se o cliente quiser agendar, peça o serviço, dia e horário.
3. Use o tom de voz solicitado.
4. Se não souber algo ou atingir uma restrição, peça para aguardar um atendente humano.
5. Se detectar palavras como "problema", "reclamação" ou "urgente", avise que um humano irá assumir.`;


  try {
    const { aiGateway } = await import('@/lib/ai-gateway.server');
    const { generateText } = await import('ai');

    const { text: aiResponse } = await generateText({
      model: aiGateway('gpt-4o-mini'),
      system: systemPrompt,
      prompt: customerText,
    });

    // 2. Send back to WhatsApp
    const send = await sendWhatsAppText({
      phoneNumberId: channel.phone_number_id,
      accessToken: channel.access_token,
      to: customerPhone,
      text: aiResponse,
    });

    if (send.wa_message_id) {
      // 3. Log outgoing message
      await supabaseAdmin.from('wa_messages').insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        direction: 'out',
        text: aiResponse,
        ai_used: true,
        wa_message_id: send.wa_message_id,
      });
    }
  } catch (error) {
    console.error('WhatsApp Agent Error:', error);
  }
}

export async function sendWhatsAppText({
  phoneNumberId,
  accessToken,
  to,
  text,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}) {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text }
      }),
    });

    const metaResult: any = await response.json();

    if (metaResult.messages?.[0]) {
      return { wa_message_id: metaResult.messages[0].id };
    }
    
    return { error: metaResult.error?.message || 'Unknown error' };
  } catch (error: any) {
    return { error: error.message };
  }
}
