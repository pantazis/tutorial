SELECT
  to_regclass('public.quiz_cycles') IS NOT NULL
  AND to_regclass('public.quiz_attempts') IS NOT NULL
  AND to_regclass('public.quiz_attempt_questions') IS NOT NULL
  AND to_regclass('public.quiz_attempt_options') IS NOT NULL
  AND to_regclass('public.quiz_submitted_answers') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'quiz_cycles_active_unique'
      AND indexdef LIKE '%WHERE is_active%'
  )
  AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'quiz_attempts_open_unique'
      AND indexdef LIKE '%WHERE (submitted_at IS NULL)%'
  )
  AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE NOT tgisinternal AND tgname = 'quiz_attempts_history_protected'
  )
  AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE NOT tgisinternal AND tgname = 'quiz_attempt_questions_immutable'
  ) AS ok;