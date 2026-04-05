-- ============================================================
-- Finatiq: Cleanup rejected scanned documents + Cost tracking views
-- NESPOUŠTĚJ AUTOMATICKY — aplikuj ručně přes Supabase dashboard
-- ============================================================

-- ============================================================
-- 1. Cleanup function: smaže opuštěné rejected dokumenty starší 30 dní
-- ============================================================
-- POZNÁMKA: Tato funkce maže záznamy z DB, ale soubory ze Storage musíš mazat
-- buď přes Edge Function (viz níže) nebo manuálně.
-- Supabase SQL nemá přímý přístup ke Storage API.

CREATE OR REPLACE FUNCTION cleanup_rejected_scanned_documents()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Najdi a smaž rejected dokumenty starší 30 dní, které nebyly ručně přepsány
  WITH deleted AS (
    DELETE FROM scanned_documents
    WHERE quality_status = 'rejected'
      AND manually_overridden = false
      AND created_at < now() - interval '30 days'
    RETURNING id, file_path
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- Pokud máš pg_cron nastavený, naplánuj denně ve 3:00 ráno:
-- SELECT cron.schedule('cleanup-rejected-scanned-docs', '0 3 * * *', 'SELECT cleanup_rejected_scanned_documents()');

-- Pokud pg_cron NENÍ nastavený:
-- 1. Zapni pg_cron extension v Supabase Dashboard → Database → Extensions
-- 2. Pak spusť:
--    SELECT cron.schedule('cleanup-rejected-scanned-docs', '0 3 * * *', 'SELECT cleanup_rejected_scanned_documents()');
--
-- ALTERNATIVA: Supabase Edge Function
-- Viz /supabase/functions/cleanup-rejected-documents/index.ts
-- Zascheduluj přes Supabase Dashboard → Edge Functions → Cron Triggers

-- ============================================================
-- 2. Cost tracking views
-- ============================================================

-- Měsíční náklady per tenant
CREATE OR REPLACE VIEW v_scanned_document_costs_monthly AS
SELECT
  tenant_id,
  date_trunc('month', created_at) as month,
  count(*) as total_documents,
  sum(cost_usd) as total_cost_usd,
  count(*) FILTER (WHERE escalated) as escalated_count,
  count(*) FILTER (WHERE was_rejected) as rejected_count,
  count(*) FILTER (WHERE was_overridden) as overridden_count,
  avg(cost_usd) as avg_cost_per_doc,
  sum(tokens_total) as total_tokens,
  avg(processing_time_ms) as avg_processing_time_ms
FROM scanned_document_processing_logs
GROUP BY tenant_id, date_trunc('month', created_at);

-- Nejčastější rejection reasons
CREATE OR REPLACE VIEW v_scanned_document_rejection_stats AS
SELECT
  d.rejection_reason,
  count(*) as occurrences,
  count(*) FILTER (WHERE d.manually_overridden) as overridden_count,
  round(
    count(*) FILTER (WHERE d.manually_overridden)::numeric / NULLIF(count(*), 0) * 100, 1
  ) as override_rate_pct
FROM scanned_documents d
WHERE d.quality_status IN ('rejected', 'manual_override')
GROUP BY d.rejection_reason
ORDER BY occurrences DESC;

-- Celkové statistiky (globální)
CREATE OR REPLACE VIEW v_scanned_document_processing_summary AS
SELECT
  count(*) as total_processed,
  count(*) FILTER (WHERE quality_status = 'ok') as ok_count,
  count(*) FILTER (WHERE quality_status = 'warning') as warning_count,
  count(*) FILTER (WHERE was_rejected) as rejected_count,
  count(*) FILTER (WHERE escalated) as escalated_count,
  count(*) FILTER (WHERE was_overridden) as overridden_count,
  sum(cost_usd) as total_cost_usd,
  avg(cost_usd) as avg_cost_per_doc,
  avg(processing_time_ms) as avg_processing_time_ms,
  -- Model breakdown
  count(*) FILTER (WHERE model_used = 'gpt-4o-mini') as mini_count,
  count(*) FILTER (WHERE model_used = 'gpt-4o') as full_count
FROM scanned_document_processing_logs;
