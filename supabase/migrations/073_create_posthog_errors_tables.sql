CREATE TABLE IF NOT EXISTS posthog_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posthog_issue_id text UNIQUE NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  exception_type text NOT NULL,
  exception_message text NOT NULL,
  exception_stack_trace text,
  fingerprint text,
  occurrence_count integer DEFAULT 0,
  users_count integer DEFAULT 0,
  first_seen timestamptz NOT NULL,
  last_seen timestamptz NOT NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posthog_errors_status ON posthog_errors(status);
CREATE INDEX IF NOT EXISTS idx_posthog_errors_exception_type ON posthog_errors(exception_type);
CREATE INDEX IF NOT EXISTS idx_posthog_errors_last_seen ON posthog_errors(last_seen DESC);

CREATE TABLE IF NOT EXISTS posthog_poll_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issues_synced integer NOT NULL DEFAULT 0,
  new_issues integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posthog_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE posthog_poll_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read posthog_errors"
  ON posthog_errors FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service role can write posthog_errors"
  ON posthog_errors FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can read posthog_poll_log"
  ON posthog_poll_log FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service role can write posthog_poll_log"
  ON posthog_poll_log FOR ALL
  USING (auth.role() = 'service_role');
