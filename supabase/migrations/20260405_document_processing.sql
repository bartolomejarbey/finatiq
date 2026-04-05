-- ============================================================
-- Finatiq: Scanned Document Processing via OpenAI Vision
-- Tabulky pro AI zpracování dokumentů (účtenky, faktury, výpisy)
-- NESPOUŠTĚJ AUTOMATICKY — aplikuj ručně přes Supabase dashboard
--
-- POZOR: Legacy tabulka `documents` (přílohy smluv) existuje a NESMÍ
-- být smazána. Tento skript vytváří NOVOU tabulku `scanned_documents`.
-- ============================================================

-- Safety: smaž pokud předchozí spuštění částečně proběhlo
DROP TABLE IF EXISTS scanned_document_processing_logs CASCADE;
DROP TABLE IF EXISTS scanned_documents CASCADE;

-- 1. Tabulka scanned_documents
CREATE TABLE scanned_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- TODO: Až přidáme team accounts, tenant_id musí jít z advisors.id nebo organization tabulky
  tenant_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  client_id uuid,

  file_path text NOT NULL,
  file_name text,
  file_size_bytes integer,
  mime_type text,

  -- Extrahovaná data
  document_type text,
  merchant_name text,
  merchant_ico text,
  merchant_dic text,
  document_date date,
  total_amount numeric(12, 2),
  currency text DEFAULT 'CZK',
  vat_amount numeric(12, 2),
  items jsonb,
  summary text,

  -- Quality assessment
  quality_status text CHECK (quality_status IN ('ok', 'warning', 'rejected', 'manual_override', 'failed')),
  rejection_reason text,
  retry_guidance text,
  warning_fields jsonb,
  manually_overridden boolean DEFAULT false,
  override_reason text,
  original_rejection_reason text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scanned_documents_tenant ON scanned_documents(tenant_id);
CREATE INDEX idx_scanned_documents_client ON scanned_documents(client_id);
CREATE INDEX idx_scanned_documents_quality ON scanned_documents(quality_status);
CREATE INDEX idx_scanned_documents_date ON scanned_documents(document_date);

-- 2. Tabulka scanned_document_processing_logs (audit + cost tracking)
CREATE TABLE scanned_document_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_document_id uuid REFERENCES scanned_documents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,

  model_used text NOT NULL,
  escalated boolean DEFAULT false,
  quality_status text,
  was_rejected boolean DEFAULT false,
  was_overridden boolean DEFAULT false,

  tokens_input integer,
  tokens_output integer,
  tokens_total integer,
  cost_usd numeric(10, 6),

  processing_time_ms integer,
  error_message text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scanned_document_processing_logs_tenant ON scanned_document_processing_logs(tenant_id);
CREATE INDEX idx_scanned_document_processing_logs_created ON scanned_document_processing_logs(created_at);
CREATE INDEX idx_scanned_document_processing_logs_document ON scanned_document_processing_logs(scanned_document_id);

-- 3. RLS policies
ALTER TABLE scanned_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_document_processing_logs ENABLE ROW LEVEL SECURITY;

-- Poradce (tenant) vidí svoje dokumenty
CREATE POLICY "Tenant can view own scanned documents"
  ON scanned_documents FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenant can insert own scanned documents"
  ON scanned_documents FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenant can update own scanned documents"
  ON scanned_documents FOR UPDATE
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenant can delete own scanned documents"
  ON scanned_documents FOR DELETE
  USING (auth.uid() = tenant_id);

-- Klient vidí dokumenty, které nahrál, nebo které patří jeho poradci a jsou přiřazené jemu
CREATE POLICY "Client can view own scanned documents"
  ON scanned_documents FOR SELECT
  USING (auth.uid() = uploaded_by OR auth.uid()::text IN (
    SELECT c.user_id::text FROM clients c WHERE c.id = scanned_documents.client_id
  ));

CREATE POLICY "Client can insert scanned documents"
  ON scanned_documents FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- Processing logs — tenant only
CREATE POLICY "Tenant can view own scanned document processing logs"
  ON scanned_document_processing_logs FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenant can insert scanned document processing logs"
  ON scanned_document_processing_logs FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

-- Service role má plný přístup (Supabase default pro service_role key)
-- Není potřeba explicitní policy

-- 4. Storage bucket (pokud neexistuje)
-- Spusť v Supabase dashboard → Storage → New Bucket:
--   Name: scanned-documents
--   Public: false
--   File size limit: 10MB
--   Allowed MIME types: image/jpeg, image/png, application/pdf

-- Storage RLS policies (spusť v SQL editoru):
-- INSERT: auth.uid() IS NOT NULL
-- SELECT: auth.uid()::text = (storage.foldername(name))[1]
-- DELETE: auth.uid()::text = (storage.foldername(name))[1]
