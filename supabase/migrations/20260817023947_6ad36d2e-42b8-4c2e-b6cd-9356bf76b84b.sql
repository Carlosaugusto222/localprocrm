
-- Add status for returns in sales
DO $$ BEGIN
    ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'returned';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add extra fields to service_orders for 'campos extras'
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS extra_fields JSONB DEFAULT '{}'::jsonb;

-- Ensure OS number is correctly tracked
ALTER TABLE public.service_orders ALTER COLUMN number SET NOT NULL;

-- Audit trail for returns
COMMENT ON COLUMN public.sales.status IS 'quote, order, paid, cancelled, returned';

-- Grant permissions (standard procedure)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_orders TO authenticated;
GRANT ALL ON public.sales TO service_role;
GRANT ALL ON public.service_orders TO service_role;
