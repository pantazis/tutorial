CREATE TABLE learner_course_generations (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  course_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  generation_number integer NOT NULL CHECK (generation_number > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  closed_at timestamptz,
  UNIQUE (account_id, course_id, generation_number),
  UNIQUE (id, revision_id),
  FOREIGN KEY (course_id, revision_id) REFERENCES course_revisions(course_id, id),
  CHECK ((is_active AND closed_at IS NULL) OR (NOT is_active AND closed_at IS NOT NULL))
);

CREATE UNIQUE INDEX learner_course_generations_active_unique
  ON learner_course_generations (account_id, course_id) WHERE is_active;

CREATE TABLE learner_course_progress (
  generation_id uuid PRIMARY KEY REFERENCES learner_course_generations(id),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  percentage integer NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE TABLE learner_lesson_progress (
  generation_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  percentage integer NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (generation_id, lesson_id),
  FOREIGN KEY (generation_id, revision_id) REFERENCES learner_course_generations(id, revision_id),
  FOREIGN KEY (revision_id, lesson_id) REFERENCES course_lessons(revision_id, id)
);

CREATE TABLE learner_item_progress (
  generation_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  item_id uuid NOT NULL,
  end_eligible_at timestamptz,
  completed_at timestamptz,
  completion_method text CHECK (
    completion_method IS NULL OR completion_method IN ('tutorial_explicit', 'text_end', 'media_end', 'quiz_pass')
  ),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (generation_id, item_id),
  FOREIGN KEY (generation_id, revision_id) REFERENCES learner_course_generations(id, revision_id),
  FOREIGN KEY (revision_id, item_id) REFERENCES lesson_items(revision_id, id),
  CHECK (completed_at IS NULL OR completion_method IS NOT NULL)
);

CREATE TABLE learner_progress_history (
  id uuid PRIMARY KEY,
  generation_id uuid NOT NULL REFERENCES learner_course_generations(id),
  account_id uuid NOT NULL REFERENCES accounts(id),
  course_id uuid NOT NULL REFERENCES courses(id),
  revision_id uuid NOT NULL REFERENCES course_revisions(id),
  lesson_id uuid REFERENCES course_lessons(id),
  item_id uuid REFERENCES lesson_items(id),
  action text NOT NULL CHECK (
    action IN ('course_started', 'lesson_started', 'item_end_reached', 'item_completed', 'lesson_completed', 'course_completed')
  ),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX learner_progress_history_generation_index
  ON learner_progress_history (generation_id, occurred_at, id);

CREATE OR REPLACE FUNCTION reject_learner_progress_history_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'learner progress history is immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER learner_progress_history_immutable
BEFORE UPDATE OR DELETE ON learner_progress_history
FOR EACH ROW EXECUTE FUNCTION reject_learner_progress_history_change();