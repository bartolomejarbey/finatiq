-- ============================================================
-- RLS policies for client portal tables
-- Allows authenticated users to access their own data
-- via their client record (clients.user_id = auth.uid())
-- ============================================================

-- Helper: get client_id for current user
CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- CLIENTS table
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Client can read own record
DO $$ BEGIN
  CREATE POLICY "clients_select_own" ON public.clients
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Client can update own record
DO $$ BEGIN
  CREATE POLICY "clients_update_own" ON public.clients
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Client can insert own record (self-registration)
DO $$ BEGIN
  CREATE POLICY "clients_insert_own" ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CONTRACTS table
-- ============================================================
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "contracts_select_own" ON public.contracts
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "contracts_insert_own" ON public.contracts
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "contracts_update_own" ON public.contracts
    FOR UPDATE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CLIENT_DOCUMENTS table
-- ============================================================
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "client_documents_select_own" ON public.client_documents
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "client_documents_insert_own" ON public.client_documents
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "client_documents_update_own" ON public.client_documents
    FOR UPDATE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- FINANCIAL_GOALS table
-- ============================================================
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "financial_goals_select_own" ON public.financial_goals
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "financial_goals_insert_own" ON public.financial_goals
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "financial_goals_update_own" ON public.financial_goals
    FOR UPDATE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "financial_goals_delete_own" ON public.financial_goals
    FOR DELETE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- INVESTMENTS table
-- ============================================================
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "investments_select_own" ON public.investments
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investments_insert_own" ON public.investments
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investments_update_own" ON public.investments
    FOR UPDATE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CLIENT_NOTIFICATIONS table
-- ============================================================
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "client_notifications_select_own" ON public.client_notifications
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "client_notifications_update_own" ON public.client_notifications
    FOR UPDATE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CLIENT_WISHES table
-- ============================================================
ALTER TABLE public.client_wishes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "client_wishes_select_own" ON public.client_wishes
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "client_wishes_insert_own" ON public.client_wishes
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ADVISORS table (read-only for clients — needed for theme, modules)
-- ============================================================
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "advisors_select_for_clients" ON public.advisors
    FOR SELECT TO authenticated
    USING (
      id IN (SELECT advisor_id FROM public.clients WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- OSVC_RECORDS table
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.osvc_records ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "osvc_records_select_own" ON public.osvc_records
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
  CREATE POLICY "osvc_records_insert_own" ON public.osvc_records
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ONBOARDING_PROGRESS table
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "onboarding_progress_select_own" ON public.onboarding_progress
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  CREATE POLICY "onboarding_progress_upsert_own" ON public.onboarding_progress
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
  CREATE POLICY "onboarding_progress_update_own" ON public.onboarding_progress
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Storage: deal-documents bucket access for clients
-- ============================================================
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('deal-documents', 'deal-documents', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "deal_docs_select_own" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'deal-documents'
      AND (storage.foldername(name))[1] = 'client-docs'
      AND (storage.foldername(name))[2] = public.get_my_client_id()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "deal_docs_insert_own" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'deal-documents'
      AND (storage.foldername(name))[1] = 'client-docs'
      AND (storage.foldername(name))[2] = public.get_my_client_id()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
