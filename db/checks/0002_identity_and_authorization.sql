SELECT
  to_regclass('public.accounts') IS NOT NULL
  AND to_regclass('public.auth_sessions') IS NOT NULL
  AND to_regclass('public.auth_tokens') IS NOT NULL
  AND to_regclass('public.admin_invitations') IS NOT NULL
  AND to_regclass('public.security_audit') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('auth_sessions', 'auth_tokens', 'admin_invitations')
      AND column_name IN ('token', 'raw_token', 'session_token')
  ) AS ok;