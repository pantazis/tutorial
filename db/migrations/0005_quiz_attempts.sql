CREATE TABLE quiz_cycles (
  id uuid PRIMARY KEY,
  generation_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  quiz_item_id uuid NOT NULL,
  cycle_number integer NOT NULL CHECK (cycle_number > 0),
  is_active boolean NOT NULL DEFAULT true,
  next_eligible_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  reset_by_account_id uuid REFERENCES accounts(id),
  reset_reason text,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  closed_at timestamptz,
  UNIQUE (generation_id, quiz_item_id, cycle_number),
  UNIQUE (id, generation_id, revision_id, quiz_item_id),
  FOREIGN KEY (generation_id, revision_id) REFERENCES learner_course_generations(id, revision_id),
  FOREIGN KEY (revision_id, quiz_item_id) REFERENCES quiz_definitions(revision_id, item_id),
  CHECK ((is_active AND closed_at IS NULL) OR (NOT is_active AND closed_at IS NOT NULL)),
  CHECK ((reset_by_account_id IS NULL AND reset_reason IS NULL) OR char_length(btrim(reset_reason)) BETWEEN 1 AND 1000)
);

CREATE UNIQUE INDEX quiz_cycles_active_unique
  ON quiz_cycles (generation_id, quiz_item_id) WHERE is_active;

CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY,
  cycle_id uuid NOT NULL,
  generation_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  quiz_item_id uuid NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  pass_percentage_snapshot integer NOT NULL CHECK (pass_percentage_snapshot BETWEEN 1 AND 100),
  attempt_limit_snapshot integer CHECK (attempt_limit_snapshot IS NULL OR attempt_limit_snapshot > 0),
  reveal_policy_snapshot text NOT NULL
    CHECK (reveal_policy_snapshot IN ('never', 'after_submission', 'after_exhaustion')),
  started_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  submitted_at timestamptz,
  score_percentage integer CHECK (score_percentage BETWEEN 0 AND 100),
  passed boolean,
  UNIQUE (cycle_id, attempt_number),
  UNIQUE (id, cycle_id),
  UNIQUE (id, generation_id, revision_id, quiz_item_id),
  FOREIGN KEY (cycle_id, generation_id, revision_id, quiz_item_id)
    REFERENCES quiz_cycles(id, generation_id, revision_id, quiz_item_id),
  CHECK (
    (submitted_at IS NULL AND score_percentage IS NULL AND passed IS NULL)
    OR
    (submitted_at IS NOT NULL AND score_percentage IS NOT NULL AND passed IS NOT NULL)
  )
);

CREATE UNIQUE INDEX quiz_attempts_open_unique
  ON quiz_attempts (cycle_id) WHERE submitted_at IS NULL;

CREATE INDEX quiz_attempts_history_index
  ON quiz_attempts (generation_id, quiz_item_id, started_at, id);

CREATE TABLE quiz_attempt_questions (
  id uuid PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES quiz_attempts(id),
  source_question_id uuid NOT NULL,
  display_position integer NOT NULL CHECK (display_position >= 0),
  question_type text NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
  prompt text NOT NULL CHECK (char_length(btrim(prompt)) > 0),
  UNIQUE (attempt_id, id),
  UNIQUE (attempt_id, source_question_id),
  UNIQUE (attempt_id, display_position),
  FOREIGN KEY (source_question_id) REFERENCES quiz_questions(id)
);

CREATE TABLE quiz_attempt_options (
  id uuid PRIMARY KEY,
  attempt_id uuid NOT NULL,
  attempt_question_id uuid NOT NULL,
  source_option_id uuid NOT NULL REFERENCES quiz_options(id),
  display_position integer NOT NULL CHECK (display_position >= 0),
  label text NOT NULL CHECK (char_length(btrim(label)) > 0),
  is_correct boolean NOT NULL,
  UNIQUE (attempt_id, id),
  UNIQUE (attempt_id, attempt_question_id, id),
  UNIQUE (attempt_question_id, source_option_id),
  UNIQUE (attempt_question_id, display_position),
  FOREIGN KEY (attempt_id, attempt_question_id) REFERENCES quiz_attempt_questions(attempt_id, id)
);

CREATE TABLE quiz_submitted_answers (
  attempt_id uuid NOT NULL,
  attempt_question_id uuid NOT NULL,
  attempt_option_id uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (attempt_id, attempt_question_id, attempt_option_id),
  FOREIGN KEY (attempt_id, attempt_question_id)
    REFERENCES quiz_attempt_questions(attempt_id, id),
  FOREIGN KEY (attempt_id, attempt_question_id, attempt_option_id)
    REFERENCES quiz_attempt_options(attempt_id, attempt_question_id, id)
);

CREATE OR REPLACE FUNCTION protect_quiz_cycle_history()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'quiz cycle history is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.is_active
     AND NOT NEW.is_active
     AND NEW.closed_at IS NOT NULL
     AND NEW.id = OLD.id
     AND NEW.generation_id = OLD.generation_id
     AND NEW.revision_id = OLD.revision_id
     AND NEW.quiz_item_id = OLD.quiz_item_id
     AND NEW.cycle_number = OLD.cycle_number
     AND NEW.next_eligible_at = OLD.next_eligible_at
     AND NEW.reset_by_account_id IS NOT DISTINCT FROM OLD.reset_by_account_id
     AND NEW.reset_reason IS NOT DISTINCT FROM OLD.reset_reason
     AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'quiz cycle history is immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER quiz_cycles_history_protected
BEFORE UPDATE OR DELETE ON quiz_cycles
FOR EACH ROW EXECUTE FUNCTION protect_quiz_cycle_history();

CREATE OR REPLACE FUNCTION protect_quiz_attempt_history()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'quiz attempt history is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.submitted_at IS NULL
     AND NEW.submitted_at IS NOT NULL
     AND NEW.score_percentage IS NOT NULL
     AND NEW.passed IS NOT NULL
     AND NEW.id = OLD.id
     AND NEW.cycle_id = OLD.cycle_id
     AND NEW.generation_id = OLD.generation_id
     AND NEW.revision_id = OLD.revision_id
     AND NEW.quiz_item_id = OLD.quiz_item_id
     AND NEW.attempt_number = OLD.attempt_number
     AND NEW.pass_percentage_snapshot = OLD.pass_percentage_snapshot
     AND NEW.attempt_limit_snapshot IS NOT DISTINCT FROM OLD.attempt_limit_snapshot
     AND NEW.reveal_policy_snapshot = OLD.reveal_policy_snapshot
     AND NEW.started_at = OLD.started_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'quiz attempt history is immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER quiz_attempts_history_protected
BEFORE UPDATE OR DELETE ON quiz_attempts
FOR EACH ROW EXECUTE FUNCTION protect_quiz_attempt_history();

CREATE OR REPLACE FUNCTION reject_quiz_snapshot_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'quiz attempt snapshot is immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER quiz_attempt_questions_immutable
BEFORE UPDATE OR DELETE ON quiz_attempt_questions
FOR EACH ROW EXECUTE FUNCTION reject_quiz_snapshot_change();
CREATE TRIGGER quiz_attempt_options_immutable
BEFORE UPDATE OR DELETE ON quiz_attempt_options
FOR EACH ROW EXECUTE FUNCTION reject_quiz_snapshot_change();
CREATE TRIGGER quiz_submitted_answers_immutable
BEFORE UPDATE OR DELETE ON quiz_submitted_answers
FOR EACH ROW EXECUTE FUNCTION reject_quiz_snapshot_change();