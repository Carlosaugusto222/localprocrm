import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai-compatible';

const aiGateway = createOpenAI({
  baseURL: 'https://gateway.lovable.ai/v1',
  apiKey: process.env['LOVABLE_AI_GATEWAY_KEY'] || '',
});

export async function handleWhatsAppMessage(channel: any, value: any) {
  const message = value.messages[0];
  const contact = value.contacts[0];
  const waPhone = message.from; 
  const text = message.text?.body;

  if (!text) return;

  // 1. Find or create conversation
  let { data: conversation } = await supabaseAdmin
    .from('wa_conversations')
    .select('*, customer:customers(*)')
    .eq('organization_id', channel.organization_id)
    .eq('wa_phone', waPhone)
    .maybeSingle();

  if (!conversation) {
    // Check if customer exists by phone
    let { data: customer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('organization_id', channel.organization_id)
      .eq('phone', waPhone)
      .maybeSingle();

    if (!customer) {
      const { data: newCust, error: custErr } = await supabaseAdmin
        .from('customers')
        .insert({
          organization_id: channel.organization_id,
          name: contact?.profile?.name || 'Cliente WhatsApp',
          phone: waPhone,
          pipeline_stage: 'new'
        })
        .select()
        .single();
      
      if (custErr) throw custErr;
      customer = newCust;
    }

    const { data: newConv, error: convErr } = await supabaseAdmin
      .from('wa_conversations')
      .insert({
        organization_id: channel.organization_id,
        customer_id: customer?.id,
        wa_phone: waPhone,
        wa_name: contact?.profile?.name || null,
        status: 'bot',
        channel_id: channel.id
      })
      .select()
      .single();
    
    if (convErr) throw convErr;
    // Fetch again to get relations if needed, but we have enough here
    conversation = { ...newConv, customer };
  }

  // 2. Log incoming message
  await supabaseAdmin.from('wa_messages').insert({
    organization_id: channel.organization_id,
    conversation_id: conversation!.id,
    direction: 'in',
    wa_message_id: message.id,
    text: text
  });

  // Update last_message_at
  await supabaseAdmin.from('wa_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation!.id);

  // 3. AI Reply if enabled and in bot mode
  if (channel.auto_reply && conversation!.status === 'bot') {
    await sendAIReply(channel, conversation, text);
  }
}

async function sendAIReply(channel: any, conversation: any, userText: string) {
  const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('id', channel.organization_id).single();
  const { data: services } = await supabaseAdmin.from('products').select('*').eq('organization_id', channel.organization_id).eq('kind', 'service');
  
  if (!org) return;

  const systemPrompt = `Você é o atendente virtual da empresa ${org.name}.
Seu objetivo é ser prestativo, educado e ajudar o cliente a agendar serviços ou tirar dúvidas.
Informações da empresa: ${org.address || 'Não informado'}.
Serviços disponíveis: ${services?.map(s => `${s.name} (R$ ${s.price})`).join(', ') || 'Consultar preços'}.

Regras:
1. Responda de forma curta e objetiva (máximo 3 parágrafos).
2. Se o cliente quiser agendar, peça o serviço, dia e horário.
3. Use emojis para ser amigável.
4. Se não souber algo, peça para aguardar um atendente humano.
5. Se detectar palavras como "problema", "reclamação" ou "urgente", avise que um humano irá assumir.`;

  try {
    const { text: aiResponse } = await generateText({
      model: aiGateway('gemini-1.5-flash'),
      system: systemPrompt,
      prompt: userText,
    });

    // 4. Send back to WhatsApp via Meta API
    const response = await fetch(`https://graph.facebook.com/v21.0/${channel.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channel.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: conversation.wa_phone,
        type: 'text',
        text: { body: aiResponse }
      }),
    });

    const metaResult: any = await response.json();

    if (metaResult.messages?.[0]) {
      // Log outgoing message
      await supabaseAdmin.from('wa_messages').insert({
        organization_id: channel.organization_id,
        conversation_id: conversation.id,
        direction: 'out',
        wa_message_id: metaResult.messages[0].id,
        text: aiResponse,
        ai_used: true
      });
    }
  } catch (error) {
    console.error('AI Reply Error:', error);
  }
}
