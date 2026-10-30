-- Fix task-table sequences after explicit-ID bulk inserts
--
-- Root cause: scripts/migrate-tasks-to-supabase.ts uses
--   INSERT ... OVERRIDING SYSTEM VALUE ... ON CONFLICT (id) DO NOTHING
-- which bypasses the sequence progression and never calls setval afterward.
-- This migration is idempotent — it uses GREATEST so already-correct sequences
-- are not changed. Safe to run on any environment.

-- tasks (integer PK)
SELECT setval(
  'tasks_id_seq',
  GREATEST(
    (SELECT last_value FROM tasks_id_seq),
    (SELECT COALESCE(MAX(id), 1) FROM tasks)
  )
);

-- task_history (bigint PK)
SELECT setval(
  'task_history_id_seq',
  GREATEST(
    (SELECT last_value FROM task_history_id_seq),
    (SELECT COALESCE(MAX(id), 1) FROM task_history)
  )
);

-- task_notes (bigint PK) — currently empty/healthy; included for completeness
SELECT setval(
  'task_notes_id_seq',
  GREATEST(
    (SELECT last_value FROM task_notes_id_seq),
    COALESCE((SELECT MAX(id) FROM task_notes), 1)
  )
);