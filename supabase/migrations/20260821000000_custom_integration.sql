ALTER TABLE public.ecommerce_integrations 
ADD COLUMN IF NOT EXISTS custom_api_url TEXT,
ADD COLUMN IF NOT EXISTS sync_orders_endpoint TEXT,
ADD COLUMN IF NOT EXISTS sync_products_endpoint TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_integrations TO authenticated;
GRANT ALL ON public.ecommerce_integrations TO service_role;
