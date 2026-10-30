-- Add plan_todos and actual_todos columns to tasks table
-- plan_todos: populated by task-plan, holds structured plan steps for todo initialization
-- actual_todos: populated by task-complete, holds final todo state for audit trail

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS plan_todos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS actual_todos JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.plan_todos IS 'Structured plan steps from task-plan, used to initialize agent todo list';
COMMENT ON COLUMN public.tasks.actual_todos IS 'Final todo state from task-complete, for audit trail';