ALTER TABLE course_groups ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE course_lessons ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE lesson_items ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

ALTER TABLE course_revisions
  DROP CONSTRAINT course_revisions_title_check,
  DROP CONSTRAINT course_revisions_summary_check,
  DROP CONSTRAINT course_revisions_cover_alt_check,
  DROP CONSTRAINT course_revisions_source_title_check,
  DROP CONSTRAINT course_revisions_source_attribution_check,
  DROP CONSTRAINT course_revisions_check,
  ADD CONSTRAINT course_revisions_title_draft_check CHECK (char_length(title) <= 200),
  ADD CONSTRAINT course_revisions_summary_draft_check CHECK (char_length(summary) <= 1000),
  ADD CONSTRAINT course_revisions_cover_alt_draft_check CHECK (char_length(cover_alt) <= 500),
  ADD CONSTRAINT course_revisions_source_title_draft_check CHECK (char_length(source_title) <= 300),
  ADD CONSTRAINT course_revisions_source_attribution_draft_check CHECK (char_length(source_attribution) <= 1000),
  ADD CONSTRAINT course_revisions_cover_uri_draft_check CHECK (cover_uri IS NULL OR char_length(cover_uri) <= 2000),
  ADD CONSTRAINT course_revisions_cover_provenance_draft_check CHECK (cover_provenance IS NULL OR char_length(cover_provenance) <= 1000),
  ADD CONSTRAINT course_revisions_source_uri_draft_check CHECK (source_uri IS NULL OR char_length(source_uri) <= 2000);

ALTER TABLE course_groups
  DROP CONSTRAINT course_groups_title_check,
  DROP CONSTRAINT course_groups_summary_check,
  ADD CONSTRAINT course_groups_title_draft_check CHECK (char_length(title) <= 200),
  ADD CONSTRAINT course_groups_summary_draft_check CHECK (char_length(summary) <= 1000);
ALTER TABLE course_lessons
  DROP CONSTRAINT course_lessons_title_check,
  DROP CONSTRAINT course_lessons_summary_check,
  ADD CONSTRAINT course_lessons_title_draft_check CHECK (char_length(title) <= 200),
  ADD CONSTRAINT course_lessons_summary_draft_check CHECK (char_length(summary) <= 1000);
ALTER TABLE lesson_items
  DROP CONSTRAINT lesson_items_item_type_check,
  DROP CONSTRAINT lesson_items_title_check,
  DROP CONSTRAINT lesson_items_summary_check,
  ADD CONSTRAINT lesson_items_item_type_check CHECK (item_type IN ('tutorial', 'topic', 'guided_meditation', 'quiz', 'youtube', 'document', 'download', 'external_resource', 'assignment')),
  ADD CONSTRAINT lesson_items_title_draft_check CHECK (char_length(title) <= 200),
  ADD CONSTRAINT lesson_items_summary_draft_check CHECK (char_length(summary) <= 1000);
ALTER TABLE topic_contents
  DROP CONSTRAINT topic_contents_body_check,
  ADD CONSTRAINT topic_contents_body_draft_check CHECK (char_length(body) <= 50000);
ALTER TABLE meditation_contents
  DROP CONSTRAINT meditation_contents_attribution_check,
  DROP CONSTRAINT meditation_contents_check,
  DROP CONSTRAINT meditation_contents_check1,
  ADD CONSTRAINT meditation_contents_body_draft_check CHECK (body IS NULL OR char_length(body) <= 50000),
  ADD CONSTRAINT meditation_contents_media_uri_draft_check CHECK (media_uri IS NULL OR char_length(media_uri) <= 2000),
  ADD CONSTRAINT meditation_contents_transcript_draft_check CHECK (transcript IS NULL OR char_length(transcript) <= 50000),
  ADD CONSTRAINT meditation_contents_captions_uri_draft_check CHECK (captions_uri IS NULL OR char_length(captions_uri) <= 2000),
  ADD CONSTRAINT meditation_contents_fallback_uri_draft_check CHECK (direct_fallback_uri IS NULL OR char_length(direct_fallback_uri) <= 2000),
  ADD CONSTRAINT meditation_contents_attribution_draft_check CHECK (char_length(attribution) <= 1000);
ALTER TABLE quiz_questions
  DROP CONSTRAINT quiz_questions_prompt_check,
  ADD CONSTRAINT quiz_questions_prompt_draft_check CHECK (char_length(prompt) <= 2000);
ALTER TABLE quiz_options
  DROP CONSTRAINT quiz_options_label_check,
  ADD CONSTRAINT quiz_options_label_draft_check CHECK (char_length(label) <= 500);

CREATE INDEX course_groups_revision_visibility_index ON course_groups (revision_id, is_hidden, outline_position, id);
CREATE INDEX course_lessons_revision_visibility_index ON course_lessons (revision_id, is_hidden, id);
CREATE INDEX lesson_items_revision_visibility_index ON lesson_items (revision_id, is_hidden, lesson_id, item_position, id);