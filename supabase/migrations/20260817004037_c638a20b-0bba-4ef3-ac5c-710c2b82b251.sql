
ALTER TABLE public.wa_channels 
ADD COLUMN IF NOT EXISTS tone_of_voice text,
ADD COLUMN IF NOT EXISTS campaign_goals text,
ADD COLUMN IF NOT EXISTS ai_restrictions text;

COMMENT ON COLUMN public.wa_channels.tone_of_voice IS 'IA tone of voice (e.g., professional, friendly, formal)';
COMMENT ON COLUMN public.wa_channels.campaign_goals IS 'Main objectives for AI campaigns';
COMMENT ON COLUMN public.wa_channels.ai_restrictions IS 'Restrictions for AI (e.g., maximum discount)';
