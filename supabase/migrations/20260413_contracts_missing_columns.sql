-- ============================================================
-- Add missing columns to contracts table
-- insurance_type and value are used by client portal but may not exist
-- NESPOUŠTĚJ AUTOMATICKY — aplikuj ručně přes Supabase dashboard
-- ============================================================

-- Add insurance_type if not exists
DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN insurance_type text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add value if not exists
DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN value numeric(12, 2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add client_uploaded if not exists
DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN client_uploaded boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
