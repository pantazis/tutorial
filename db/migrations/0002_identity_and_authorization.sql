CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  preferred_language text NOT NULL CHECK (preferred_language IN ('EL', 'EN')),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'master_admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (email = lower(email)),
  CHECK (char_length(email) BETWEEN 3 AND 320)
);

CREATE UNIQUE INDEX accounts_email_unique ON accounts (email);
CREATE INDEX accounts_active_role_index ON accounts (role) WHERE status = 'active';

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (expires_at > created_at)
);

CREATE INDEX auth_sessions_account_index ON auth_sessions (account_id, expires_at);

CREATE TABLE auth_tokens (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verification', 'password_reset')),
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (expires_at > created_at)
);

CREATE INDEX auth_tokens_account_purpose_index ON auth_tokens (account_id, purpose, expires_at);

CREATE TABLE admin_invitations (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  invited_by uuid NOT NULL REFERENCES accounts(id),
  accepted_by uuid REFERENCES accounts(id),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (email = lower(email)),
  CHECK (char_length(email) BETWEEN 3 AND 320),
  CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX admin_invitations_pending_email_unique
  ON admin_invitations (email)
  WHERE consumed_at IS NULL;

CREATE TABLE security_audit (
  id uuid PRIMARY KEY,
  actor_account_id uuid REFERENCES accounts(id),
  subject_account_id uuid REFERENCES accounts(id),
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 3 AND 80),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX security_audit_actor_index ON security_audit (actor_account_id, created_at DESC);
CREATE INDEX security_audit_subject_index ON security_audit (subject_account_id, created_at DESC);
