-- ============================================================
-- Vault columns + RLS policies for documents table
-- NESPOUŠTĚJ AUTOMATICKY — aplikuj ručně přes Supabase dashboard
-- ============================================================

-- Add vault-specific columns to documents table
DO $$ BEGIN ALTER TABLE public.documents ADD COLUMN name text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ADD COLUMN file_url text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ADD COLUMN is_vault boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ADD COLUMN vault_category text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ADD COLUMN valid_until date; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ADD COLUMN shared_with_advisor boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Select own documents
DO $$ BEGIN
  CREATE POLICY "documents_select_own" ON public.documents
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;

-- Insert own documents
DO $$ BEGIN
  CREATE POLICY "documents_insert_own" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;

-- Update own documents
DO $$ BEGIN
  CREATE POLICY "documents_update_own" ON public.documents
    FOR UPDATE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;

-- Delete own documents
DO $$ BEGIN
  CREATE POLICY "documents_delete_own" ON public.documents
    FOR DELETE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;

-- Advisor can see documents of their clients
DO $$ BEGIN
  CREATE POLICY "documents_advisor_select" ON public.documents
    FOR SELECT TO authenticated
    USING (advisor_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "documents_advisor_insert" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (advisor_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "documents_advisor_update" ON public.documents
    FOR UPDATE TO authenticated
    USING (advisor_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
