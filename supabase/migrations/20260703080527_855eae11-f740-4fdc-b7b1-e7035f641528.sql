
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS csid_certificate_pem TEXT,
  ADD COLUMN IF NOT EXISTS csid_private_key_pem TEXT,
  ADD COLUMN IF NOT EXISTS csid_secret TEXT,
  ADD COLUMN IF NOT EXISTS csid_mode TEXT NOT NULL DEFAULT 'sandbox';

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS signed_xml TEXT,
  ADD COLUMN IF NOT EXISTS signature_value TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_signed TEXT,
  ADD COLUMN IF NOT EXISTS signing_status TEXT NOT NULL DEFAULT 'unsigned',
  ADD COLUMN IF NOT EXISTS signing_error TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
