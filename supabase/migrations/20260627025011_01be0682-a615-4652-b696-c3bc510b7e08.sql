
CREATE TABLE public.wa_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL UNIQUE,
  waba_id text,
  display_phone_number text,
  access_token text NOT NULL,
  app_secret text NOT NULL,
  verify_token text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  auto_reply boolean NOT NULL DEFAULT true,
  system_prompt text,
  escalation_keywords text[] NOT NULL DEFAULT ARRAY['humano','atendente','reclamação','cancelar']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_channels TO authenticated;
GRANT ALL ON public.wa_channels TO service_role;
ALTER TABLE public.wa_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read channel" ON public.wa_channels FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "owners manage channel" ON public.wa_channels FOR ALL TO authenticated USING (public.is_org_owner(organization_id)) WITH CHECK (public.is_org_owner(organization_id));
CREATE TRIGGER trg_wa_channels_updated BEFORE UPDATE ON public.wa_channels FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.wa_channels(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  wa_phone text NOT NULL,
  wa_name text,
  status text NOT NULL DEFAULT 'bot' CHECK (status IN ('bot','human','closed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, wa_phone)
);
CREATE INDEX idx_wa_conv_org_recent ON public.wa_conversations(organization_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_conversations TO authenticated;
GRANT ALL ON public.wa_conversations TO service_role;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage conv" ON public.wa_conversations FOR ALL TO authenticated USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE TRIGGER trg_wa_conv_updated BEFORE UPDATE ON public.wa_conversations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  wa_message_id text,
  type text NOT NULL DEFAULT 'text',
  text text,
  media_url text,
  ai_used boolean NOT NULL DEFAULT false,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_msg_conv ON public.wa_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_messages TO authenticated;
GRANT ALL ON public.wa_messages TO service_role;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read msgs" ON public.wa_messages FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "members write msgs" ON public.wa_messages FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
