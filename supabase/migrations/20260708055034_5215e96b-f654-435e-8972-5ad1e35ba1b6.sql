ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_uid UUID;
CREATE UNIQUE INDEX IF NOT EXISTS sales_client_uid_uidx ON public.sales(client_uid) WHERE client_uid IS NOT NULL;