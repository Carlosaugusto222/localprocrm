import { createOpenAI } from '@ai-sdk/openai';

export const aiGateway = createOpenAI({
  baseURL: 'https://gateway.lovable.ai/v1',
  apiKey: process.env['LOVABLE_AI_GATEWAY_KEY'] || '',
});
