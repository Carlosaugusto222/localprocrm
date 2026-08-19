ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS cash_auto_open_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cash_auto_close_enabled BOOLEAN DEFAULT false;