
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS cash_auto_open_time TIME,
  ADD COLUMN IF NOT EXISTS cash_auto_close_time TIME;

GRANT SELECT, UPDATE(cash_auto_open_time, cash_auto_close_time) ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
