CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  recipient_account_id uuid NOT NULL REFERENCES accounts(id),
  event_type text NOT NULL CHECK (event_type IN ('course_published', 'course_updated', 'progress_reset')),
  language text NOT NULL CHECK (language IN ('EL', 'EN')),
  course_id uuid REFERENCES courses(id),
  revision_id uuid REFERENCES course_revisions(id),
  reset_record_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX notifications_recipient_chronology_index
  ON notifications (recipient_account_id, created_at DESC, id DESC);

CREATE TABLE reset_previews (
  id uuid PRIMARY KEY,
  actor_account_id uuid NOT NULL REFERENCES accounts(id),
  learner_account_id uuid NOT NULL REFERENCES accounts(id),
  course_id uuid NOT NULL REFERENCES courses(id),
  scope text NOT NULL CHECK (scope IN ('quiz', 'lesson', 'course')),
  target_id uuid,
  fingerprint text NOT NULL CHECK (char_length(fingerprint) = 64),
  impact jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK ((scope = 'course' AND target_id IS NULL) OR (scope <> 'course' AND target_id IS NOT NULL)),
  CHECK (expires_at > created_at)
);

CREATE INDEX reset_previews_lookup_index ON reset_previews (actor_account_id, expires_at);

CREATE TABLE reset_records (
  id uuid PRIMARY KEY,
  actor_account_id uuid NOT NULL REFERENCES accounts(id),
  learner_account_id uuid NOT NULL REFERENCES accounts(id),
  course_id uuid NOT NULL REFERENCES courses(id),
  scope text NOT NULL CHECK (scope IN ('quiz', 'lesson', 'course')),
  target_id uuid,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  fingerprint text NOT NULL CHECK (char_length(fingerprint) = 64),
  impact jsonb NOT NULL,
  before_reference jsonb NOT NULL,
  after_reference jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK ((scope = 'course' AND target_id IS NULL) OR (scope <> 'course' AND target_id IS NOT NULL))
);

ALTER TABLE notifications
  ADD CONSTRAINT notifications_reset_record_fk FOREIGN KEY (reset_record_id) REFERENCES reset_records(id);

CREATE INDEX reset_records_learner_index ON reset_records (learner_account_id, created_at DESC, id DESC);

CREATE TABLE administrator_access_audit (
  id uuid PRIMARY KEY,
  actor_account_id uuid NOT NULL REFERENCES accounts(id),
  subject_account_id uuid REFERENCES accounts(id),
  access_type text NOT NULL CHECK (access_type IN ('learner_search', 'learner_detail', 'quiz_answers', 'activity_report')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX administrator_access_actor_index
  ON administrator_access_audit (actor_account_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION reject_oversight_history_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'oversight history is immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER notifications_immutable
BEFORE UPDATE OR DELETE ON notifications
FOR EACH ROW EXECUTE FUNCTION reject_oversight_history_change();
CREATE TRIGGER reset_records_immutable
BEFORE UPDATE OR DELETE ON reset_records
FOR EACH ROW EXECUTE FUNCTION reject_oversight_history_change();
CREATE TRIGGER administrator_access_audit_immutable
BEFORE UPDATE OR DELETE ON administrator_access_audit
FOR EACH ROW EXECUTE FUNCTION reject_oversight_history_change();