SELECT
  (SELECT count(*) = 3 FROM information_schema.columns
   WHERE table_schema = 'public' AND column_name = 'is_hidden'
     AND table_name IN ('course_groups', 'course_lessons', 'lesson_items'))
  AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_items_item_type_check'
    AND pg_get_constraintdef(oid) LIKE '%youtube%assignment%')
  AND (SELECT count(*) = 12 FROM pg_constraint WHERE conname IN (
    'course_revisions_cover_uri_draft_check', 'course_revisions_cover_provenance_draft_check',
    'course_revisions_source_uri_draft_check', 'topic_contents_body_draft_check',
    'meditation_contents_body_draft_check', 'meditation_contents_media_uri_draft_check',
    'meditation_contents_transcript_draft_check', 'meditation_contents_captions_uri_draft_check',
    'meditation_contents_fallback_uri_draft_check', 'meditation_contents_attribution_draft_check',
    'quiz_questions_prompt_draft_check', 'quiz_options_label_draft_check'))
  AND to_regclass('public.course_groups_revision_visibility_index') IS NOT NULL
  AND to_regclass('public.course_lessons_revision_visibility_index') IS NOT NULL
  AND to_regclass('public.lesson_items_revision_visibility_index') IS NOT NULL
  AND (SELECT count(*) >= 9 FROM pg_trigger WHERE NOT tgisinternal
    AND tgname IN ('course_revisions_immutable_published', 'course_groups_immutable_published',
      'course_lessons_immutable_published', 'lesson_items_immutable_published',
      'topic_contents_immutable_published', 'meditation_contents_immutable_published',
      'quiz_definitions_immutable_published', 'quiz_questions_immutable_published', 'quiz_options_immutable_published')) AS ok;