import { createOpenAI } from '@ai-sdk/openai';

export const aiGateway = createOpenAI({
  baseURL: 'https://gateway.lovable.ai/v1',
  apiKey: process.env['LOVABLE_AI_GATEWAY_KEY'] || process.env['LOVABLE_API_KEY'] || '',
});

// Legacy helper for compatibility
export const createLovableAiGatewayProvider = (apiKey: string) => {
  return createOpenAI({
    baseURL: 'https://gateway.lovable.ai/v1',
    apiKey: apiKey,
  });
};
