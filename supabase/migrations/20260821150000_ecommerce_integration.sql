-- Create enum for ecommerce platforms
CREATE TYPE public.ecommerce_platform AS ENUM ('shopify', 'woocommerce', 'nuvemshop', 'mercado_livre', 'custom');

-- Create table for ecommerce integrations
CREATE TABLE public.ecommerce_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    platform ecommerce_platform NOT NULL,
    api_key TEXT,
    api_secret TEXT,
    access_token TEXT,
    webhook_secret TEXT,
    shop_url TEXT,
    is_active BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, platform)
);

-- Enable RLS
ALTER TABLE public.ecommerce_integrations ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_integrations TO authenticated;
GRANT ALL ON public.ecommerce_integrations TO service_role;

-- Policies
CREATE POLICY "Users can view their own organization integrations"
    ON public.ecommerce_integrations FOR SELECT
    TO authenticated
    USING (public.is_org_member(organization_id));

CREATE POLICY "Owners can manage organization integrations"
    ON public.ecommerce_integrations FOR ALL
    TO authenticated
    USING (public.is_org_owner(organization_id))
    WITH CHECK (public.is_org_owner(organization_id));

-- Add trigger for updated_at
CREATE TRIGGER set_ecommerce_integrations_updated_at
    BEFORE UPDATE ON public.ecommerce_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
