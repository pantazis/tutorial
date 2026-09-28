CREATE TABLE courses (
  id uuid PRIMARY KEY,
  language text NOT NULL CHECK (language IN ('EL', 'EN')),
  admin_order integer NOT NULL CHECK (admin_order >= 0),
  lifecycle_status text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'published', 'unpublished', 'archived')),
  current_draft_revision_id uuid,
  published_revision_id uuid,
  created_by uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX courses_language_order_index ON courses (language, admin_order, id);

CREATE TABLE course_revisions (
  id uuid PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES courses(id),
  revision_number integer NOT NULL CHECK (revision_number > 0),
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version > 0),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 1000),
  cover_kind text NOT NULL CHECK (cover_kind IN ('uploaded', 'fallback')),
  cover_uri text,
  cover_alt text NOT NULL CHECK (char_length(btrim(cover_alt)) BETWEEN 1 AND 500),
  cover_provenance text,
  focal_x numeric(5, 2) NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y numeric(5, 2) NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  source_title text NOT NULL CHECK (char_length(btrim(source_title)) BETWEEN 1 AND 300),
  source_attribution text NOT NULL CHECK (char_length(btrim(source_attribution)) BETWEEN 1 AND 1000),
  source_uri text,
  created_by uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (course_id, revision_number),
  UNIQUE (course_id, id),
  CHECK (
    (cover_kind = 'fallback' AND cover_uri IS NULL AND cover_provenance IS NULL)
    OR
    (cover_kind = 'uploaded' AND char_length(btrim(cover_uri)) > 0 AND char_length(btrim(cover_provenance)) > 0)
  )
);

ALTER TABLE courses
  ADD CONSTRAINT courses_current_draft_revision_fk
    FOREIGN KEY (id, current_draft_revision_id) REFERENCES course_revisions(course_id, id),
  ADD CONSTRAINT courses_published_revision_fk
    FOREIGN KEY (id, published_revision_id) REFERENCES course_revisions(course_id, id);

CREATE TABLE course_groups (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES course_revisions(id) ON DELETE CASCADE,
  outline_position integer NOT NULL CHECK (outline_position >= 0),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 1000),
  UNIQUE (revision_id, id),
  UNIQUE (revision_id, outline_position)
);

CREATE TABLE course_lessons (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES course_revisions(id) ON DELETE CASCADE,
  group_id uuid,
  outline_position integer,
  group_position integer,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 1000),
  UNIQUE (revision_id, id),
  FOREIGN KEY (revision_id, group_id) REFERENCES course_groups(revision_id, id) ON DELETE CASCADE,
  CHECK (
    (group_id IS NULL AND outline_position IS NOT NULL AND outline_position >= 0 AND group_position IS NULL)
    OR
    (group_id IS NOT NULL AND outline_position IS NULL AND group_position IS NOT NULL AND group_position >= 0)
  )
);

CREATE UNIQUE INDEX course_lessons_ungrouped_outline_unique
  ON course_lessons (revision_id, outline_position) WHERE group_id IS NULL;
CREATE UNIQUE INDEX course_lessons_group_position_unique
  ON course_lessons (revision_id, group_id, group_position) WHERE group_id IS NOT NULL;

CREATE TABLE lesson_items (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  item_position integer NOT NULL CHECK (item_position >= 0),
  item_type text NOT NULL CHECK (item_type IN ('tutorial', 'topic', 'guided_meditation', 'quiz')),
  is_required boolean NOT NULL DEFAULT true,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 1000),
  UNIQUE (revision_id, id),
  UNIQUE (lesson_id, item_position),
  FOREIGN KEY (revision_id, lesson_id) REFERENCES course_lessons(revision_id, id) ON DELETE CASCADE
);

CREATE TABLE topic_contents (
  item_id uuid PRIMARY KEY,
  revision_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) > 0),
  FOREIGN KEY (revision_id, item_id) REFERENCES lesson_items(revision_id, id) ON DELETE CASCADE
);

CREATE TABLE meditation_contents (
  item_id uuid PRIMARY KEY,
  revision_id uuid NOT NULL,
  format text NOT NULL CHECK (format IN ('text', 'audio', 'video')),
  body text,
  media_uri text,
  transcript text,
  captions_uri text,
  direct_fallback_uri text,
  attribution text NOT NULL CHECK (char_length(btrim(attribution)) > 0),
  FOREIGN KEY (revision_id, item_id) REFERENCES lesson_items(revision_id, id) ON DELETE CASCADE,
  CHECK (
    (format = 'text' AND char_length(btrim(body)) > 0 AND media_uri IS NULL)
    OR
    (format IN ('audio', 'video') AND body IS NULL AND char_length(btrim(media_uri)) > 0
      AND char_length(btrim(transcript)) > 0 AND char_length(btrim(direct_fallback_uri)) > 0)
  ),
  CHECK (format <> 'video' OR char_length(btrim(captions_uri)) > 0)
);

CREATE TABLE quiz_definitions (
  item_id uuid PRIMARY KEY,
  revision_id uuid NOT NULL,
  pass_percentage integer NOT NULL CHECK (pass_percentage BETWEEN 1 AND 100),
  attempt_limit integer CHECK (attempt_limit IS NULL OR attempt_limit > 0),
  reveal_policy text NOT NULL CHECK (reveal_policy IN ('never', 'after_submission', 'after_exhaustion')),
  UNIQUE (revision_id, item_id),
  FOREIGN KEY (revision_id, item_id) REFERENCES lesson_items(revision_id, id) ON DELETE CASCADE
);

CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL,
  quiz_item_id uuid NOT NULL,
  question_position integer NOT NULL CHECK (question_position >= 0),
  question_type text NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
  prompt text NOT NULL CHECK (char_length(btrim(prompt)) > 0),
  UNIQUE (revision_id, id),
  UNIQUE (quiz_item_id, question_position),
  FOREIGN KEY (revision_id, quiz_item_id) REFERENCES quiz_definitions(revision_id, item_id) ON DELETE CASCADE
);

CREATE TABLE quiz_options (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL,
  question_id uuid NOT NULL,
  option_position integer NOT NULL CHECK (option_position >= 0),
  label text NOT NULL CHECK (char_length(btrim(label)) > 0),
  is_correct boolean NOT NULL DEFAULT false,
  UNIQUE (question_id, option_position),
  FOREIGN KEY (revision_id, question_id) REFERENCES quiz_questions(revision_id, id) ON DELETE CASCADE
);

CREATE TABLE lesson_prerequisites (
  revision_id uuid NOT NULL REFERENCES course_revisions(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL,
  prerequisite_lesson_id uuid NOT NULL,
  origin text NOT NULL CHECK (origin IN ('sequential', 'custom')),
  PRIMARY KEY (revision_id, lesson_id, prerequisite_lesson_id),
  FOREIGN KEY (revision_id, lesson_id) REFERENCES course_lessons(revision_id, id) ON DELETE CASCADE,
  FOREIGN KEY (revision_id, prerequisite_lesson_id) REFERENCES course_lessons(revision_id, id) ON DELETE CASCADE,
  CHECK (lesson_id <> prerequisite_lesson_id)
);

CREATE TABLE governance_reviews (
  id uuid PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES course_revisions(id),
  revision_version integer NOT NULL CHECK (revision_version > 0),
  review_type text NOT NULL CHECK (review_type IN ('language', 'sahaja')),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes text NOT NULL CHECK (char_length(btrim(notes)) BETWEEN 1 AND 2000),
  reviewer_account_id uuid NOT NULL REFERENCES accounts(id),
  decided_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (revision_id, revision_version, review_type)
);

CREATE TABLE course_publication_history (
  id uuid PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES courses(id),
  revision_id uuid REFERENCES course_revisions(id),
  action text NOT NULL CHECK (action IN ('published', 'unpublished', 'archived')),
  actor_account_id uuid NOT NULL REFERENCES accounts(id),
  occurred_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (action <> 'published' OR revision_id IS NOT NULL)
);

CREATE INDEX course_publication_history_course_index
  ON course_publication_history (course_id, occurred_at, id);

CREATE TABLE course_activity_history (
  id uuid PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES courses(id),
  revision_id uuid NOT NULL REFERENCES course_revisions(id),
  account_id uuid NOT NULL REFERENCES accounts(id),
  activity_type text NOT NULL CHECK (activity_type IN ('course_started', 'lesson_started', 'item_progress', 'quiz_attempt')),
  occurred_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX course_activity_history_course_index ON course_activity_history (course_id, occurred_at);

CREATE TABLE course_audit (
  id uuid PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES courses(id),
  revision_id uuid REFERENCES course_revisions(id),
  actor_account_id uuid NOT NULL REFERENCES accounts(id),
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 3 AND 80),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE OR REPLACE FUNCTION reject_course_language_change_after_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.language <> OLD.language
     AND EXISTS (SELECT 1 FROM course_activity_history WHERE course_id = OLD.id) THEN
    RAISE EXCEPTION 'course language is immutable after learner activity' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER courses_language_history_guard
BEFORE UPDATE OF language ON courses
FOR EACH ROW EXECUTE FUNCTION reject_course_language_change_after_activity();

CREATE OR REPLACE FUNCTION reject_published_revision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_revision_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'course_revisions' THEN
    target_revision_id := OLD.id;
    IF OLD.state = 'published' THEN
      RAISE EXCEPTION 'published revisions are immutable' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      target_revision_id := NEW.revision_id;
    ELSE
      target_revision_id := OLD.revision_id;
    END IF;
    IF EXISTS (SELECT 1 FROM course_revisions WHERE id = target_revision_id AND state = 'published') THEN
      RAISE EXCEPTION 'published revision content is immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE'
       AND NEW.revision_id <> OLD.revision_id
       AND EXISTS (SELECT 1 FROM course_revisions WHERE id = NEW.revision_id AND state = 'published') THEN
      RAISE EXCEPTION 'published revision content is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER course_revisions_immutable_published
BEFORE UPDATE OR DELETE ON course_revisions
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();

CREATE TRIGGER course_groups_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON course_groups
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER course_lessons_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON course_lessons
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER lesson_items_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON lesson_items
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER topic_contents_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON topic_contents
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER meditation_contents_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON meditation_contents
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER quiz_definitions_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON quiz_definitions
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER quiz_questions_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON quiz_questions
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER quiz_options_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON quiz_options
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();
CREATE TRIGGER lesson_prerequisites_immutable_published
BEFORE INSERT OR UPDATE OR DELETE ON lesson_prerequisites
FOR EACH ROW EXECUTE FUNCTION reject_published_revision_mutation();

CREATE OR REPLACE FUNCTION reject_immutable_course_history_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'course history is immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER governance_reviews_immutable
BEFORE UPDATE OR DELETE ON governance_reviews
FOR EACH ROW EXECUTE FUNCTION reject_immutable_course_history_change();
CREATE TRIGGER course_publication_history_immutable
BEFORE UPDATE OR DELETE ON course_publication_history
FOR EACH ROW EXECUTE FUNCTION reject_immutable_course_history_change();
CREATE TRIGGER course_activity_history_immutable
BEFORE UPDATE OR DELETE ON course_activity_history
FOR EACH ROW EXECUTE FUNCTION reject_immutable_course_history_change();
CREATE TRIGGER course_audit_immutable
BEFORE UPDATE OR DELETE ON course_audit
FOR EACH ROW EXECUTE FUNCTION reject_immutable_course_history_change();