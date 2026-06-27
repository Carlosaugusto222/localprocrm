CREATE TABLE IF NOT EXISTS public.marketing_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'campanha',
  event_date DATE NOT NULL,
  event_time TIME,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_calendar TO authenticated;
GRANT ALL ON public.marketing_calendar TO service_role;

ALTER TABLE public.marketing_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read marketing_calendar"
  ON public.marketing_calendar FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "members write marketing_calendar"
  ON public.marketing_calendar FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE TRIGGER marketing_calendar_touch
  BEFORE UPDATE ON public.marketing_calendar
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS marketing_calendar_org_date_idx
  ON public.marketing_calendar(organization_id, event_date);