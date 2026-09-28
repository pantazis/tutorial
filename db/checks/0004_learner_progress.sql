SELECT
  to_regclass('public.learner_course_generations') IS NOT NULL
  AND to_regclass('public.learner_course_progress') IS NOT NULL
  AND to_regclass('public.learner_lesson_progress') IS NOT NULL
  AND to_regclass('public.learner_item_progress') IS NOT NULL
  AND to_regclass('public.learner_progress_history') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'learner_course_generations_active_unique'
      AND indexdef LIKE '%WHERE is_active%'
  )
  AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE NOT tgisinternal AND tgname = 'learner_progress_history_immutable'
  ) AS ok;