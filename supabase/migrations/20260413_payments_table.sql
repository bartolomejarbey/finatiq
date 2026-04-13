-- ============================================================
-- Payments table for tracking client payment obligations
-- NESPOUŠTĚJ AUTOMATICKY — aplikuj ručně přes Supabase dashboard
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  advisor_id uuid,
  contract_id uuid,

  -- Payment info
  title text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency text DEFAULT 'CZK',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),

  -- Dates
  due_date date,
  paid_date date,

  -- Recurrence
  is_recurring boolean DEFAULT false,
  recurrence_interval text CHECK (recurrence_interval IN ('monthly', 'quarterly', 'yearly', NULL)),
  recurrence_day integer CHECK (recurrence_day BETWEEN 1 AND 31 OR recurrence_day IS NULL),
  next_due_date date,

  -- Metadata
  note text,
  created_by text DEFAULT 'client' CHECK (created_by IN ('client', 'advisor', 'system')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns that might be missing on existing table
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN title text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN paid_date date; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN is_recurring boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN recurrence_interval text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN recurrence_day integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN next_due_date date; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN note text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN created_by text DEFAULT 'client'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.payments ADD COLUMN advisor_id uuid; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "payments_select_own" ON public.payments
    FOR SELECT TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "payments_insert_own" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "payments_update_own" ON public.payments
    FOR UPDATE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "payments_delete_own" ON public.payments
    FOR DELETE TO authenticated
    USING (client_id = public.get_my_client_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_function THEN NULL;
END $$;
