SELECT
  to_regclass('public.notifications') IS NOT NULL
  AND to_regclass('public.reset_previews') IS NOT NULL
  AND to_regclass('public.reset_records') IS NOT NULL
  AND to_regclass('public.administrator_access_audit') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'notifications_recipient_chronology_index'
  )
  AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE NOT tgisinternal AND tgname = 'notifications_immutable'
  )
  AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE NOT tgisinternal AND tgname = 'reset_records_immutable'
  ) AS ok;