SELECT
  to_regclass('public.courses') IS NOT NULL
  AND to_regclass('public.course_revisions') IS NOT NULL
  AND to_regclass('public.course_groups') IS NOT NULL
  AND to_regclass('public.course_lessons') IS NOT NULL
  AND to_regclass('public.lesson_items') IS NOT NULL
  AND to_regclass('public.quiz_definitions') IS NOT NULL
  AND to_regclass('public.lesson_prerequisites') IS NOT NULL
  AND to_regclass('public.governance_reviews') IS NOT NULL
  AND to_regclass('public.course_publication_history') IS NOT NULL
  AND (
    SELECT column_default = 'true'
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_items' AND column_name = 'is_required'
  )
  AND (
    SELECT count(*) >= 12
    FROM pg_trigger
    WHERE NOT tgisinternal
      AND tgname IN (
        'courses_language_history_guard',
        'course_revisions_immutable_published',
        'course_groups_immutable_published',
        'course_lessons_immutable_published',
        'lesson_items_immutable_published',
        'topic_contents_immutable_published',
        'meditation_contents_immutable_published',
        'quiz_definitions_immutable_published',
        'quiz_questions_immutable_published',
        'quiz_options_immutable_published',
        'lesson_prerequisites_immutable_published',
        'governance_reviews_immutable'
      )
  ) AS ok;