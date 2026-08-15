import { createFileRoute } from '@tanstack/react-router';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handleWhatsAppMessage } from '@/lib/wa-agent.server';

export const Route = createFileRoute('/api/public/wa/webhook')({
  server: {
    handlers: {
      // Meta Verification
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe') {
          // Find if any channel has this verify token
          const { data: channel } = await supabaseAdmin
            .from('wa_channels')
            .select('id')
            .eq('verify_token', token)
            .maybeSingle();

          if (channel) {
            return new Response(challenge);
          }
        }
        return new Response('Forbidden', { status: 403 });
      },

      // Webhook Payload
      POST: async ({ request }) => {
        const signature = request.headers.get('x-hub-signature-256');
        const rawBody = await request.text();
        const body = JSON.parse(rawBody);

        if (!body.entry?.[0]?.changes?.[0]?.value?.metadata) {
          return new Response('Ignored', { status: 200 });
        }

        const phoneId = body.entry[0].changes[0].value.metadata.phone_number_id;

        // Fetch channel config
        const { data: channel } = await supabaseAdmin
          .from('wa_channels')
          .select('*')
          .eq('phone_number_id', phoneId)
          .eq('enabled', true)
          .maybeSingle();

        if (!channel) return new Response('Channel not found', { status: 404 });

        // Verify HMAC
        if (channel.app_secret && signature) {
          const expected = 'sha256=' + createHmac('sha256', channel.app_secret)
            .update(rawBody)
            .digest('hex');
          
          if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
            return new Response('Invalid signature', { status: 401 });
          }
        }

        // Process message async (don't block Meta's 200 OK)
        // In TanStack Start we can't easily spawn background tasks that outlive the request without a queue
        // but for now we process and return since Meta has a decent timeout.
        const value = body.entry[0].changes[0].value;
        if (value.messages?.[0]) {
          await handleWhatsAppMessage(channel, value);
        }

        return new Response('OK', { status: 200 });
      }
    }
  }
});
