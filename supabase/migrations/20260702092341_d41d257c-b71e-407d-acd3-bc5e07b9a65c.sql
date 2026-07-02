
-- ZATCA Phase 2: extend branches with device/onboarding fields + hash chain state
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS device_serial TEXT NOT NULL DEFAULT ('POS-' || substr(gen_random_uuid()::text, 1, 8)),
  ADD COLUMN IF NOT EXISTS common_name TEXT,
  ADD COLUMN IF NOT EXISTS organization_name TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'SA',
  ADD COLUMN IF NOT EXISTS crn TEXT,
  ADD COLUMN IF NOT EXISTS last_invoice_hash TEXT NOT NULL DEFAULT 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==';

-- ZATCA Phase 2: extend sales with e-invoice metadata
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS icv INTEGER,
  ADD COLUMN IF NOT EXISTS uuid_zatca UUID,
  ADD COLUMN IF NOT EXISTS previous_invoice_hash TEXT,
  ADD COLUMN IF NOT EXISTS invoice_hash TEXT,
  ADD COLUMN IF NOT EXISTS xml_content TEXT,
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS zatca_status TEXT NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS zatca_response JSONB,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'simplified';

-- Atomic advancement of branch counter + hash chain (single-row transactional update)
CREATE OR REPLACE FUNCTION public.zatca_advance_branch(
  _branch_id UUID,
  _new_hash TEXT
) RETURNS TABLE (icv INTEGER, invoice_number TEXT, previous_hash TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_num INTEGER;
  _prefix TEXT;
  _prev_hash TEXT;
BEGIN
  UPDATE public.branches
     SET invoice_counter = invoice_counter + 1,
         last_invoice_hash = _new_hash
   WHERE id = _branch_id
   RETURNING invoice_counter, invoice_prefix, last_invoice_hash
     INTO _next_num, _prefix, _prev_hash;

  IF _next_num IS NULL THEN
    RAISE EXCEPTION 'Branch % not found', _branch_id;
  END IF;

  -- return the PREVIOUS hash (before update). Read separately for clarity:
  RETURN QUERY
    SELECT _next_num, (_prefix || '-' || LPAD(_next_num::TEXT, 6, '0')),
           (SELECT last_invoice_hash FROM public.branches WHERE id = _branch_id);
END;
$$;

-- Note: keeps existing generate_branch_invoice_number for backward compatibility.
