ALTER TABLE public.ecommerce_integrations 
ADD COLUMN IF NOT EXISTS custom_api_url TEXT,
ADD COLUMN IF NOT EXISTS sync_orders_endpoint TEXT,
ADD COLUMN IF NOT EXISTS sync_products_endpoint TEXT;

-- As we already have RLS and GRANTs on ecommerce_integrations from previous migrations,
-- adding columns doesn't require new GRANTs if they were applied to the table.
-- But just to be sure for the new structure:
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_integrations TO authenticated;
GRANT ALL ON public.ecommerce_integrations TO service_role;
