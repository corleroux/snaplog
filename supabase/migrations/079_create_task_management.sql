-- Migration 079: Create task management tables
-- Mirrors the local SQLite task schema for web UI access.
-- STAGING ONLY: deploy with supabase db push --project-ref <project-ref>

-- ============================================================
-- TABLE: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id                  INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    parent_id           INTEGER REFERENCES public.tasks(id),

    short_desc          TEXT NOT NULL,
    detailed_desc       TEXT NOT NULL DEFAULT '',
    classification      TEXT NOT NULL
                            CHECK (classification IN ('defect','enhancement','new_feature','alignment_issue')),
    priority            TEXT NOT NULL
                            CHECK (priority IN ('P0','P1','P2','P3','P4')),

    state               TEXT NOT NULL DEFAULT 'todo'
                            CHECK (state IN ('todo','in_progress','blocked','done','cancelled')),
    blocked_reason      TEXT,
    dependencies_met    INTEGER NOT NULL DEFAULT 0,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    estimated_end_date  TIMESTAMPTZ,
    actual_start_date   TIMESTAMPTZ,
    actual_end_date     TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    agent_id            TEXT,
    worktree_path       TEXT,
    worktree_status     TEXT,

    roadmap_id          TEXT UNIQUE,
    roadmap_tier        TEXT,
    roadmap_section     TEXT,

    metadata            JSONB,

    delivery_mode       TEXT NOT NULL DEFAULT 'code'
                            CHECK (delivery_mode IN ('code','manual')),
    plan_status         TEXT NOT NULL DEFAULT 'none'
                            CHECK (plan_status IN ('none','needs_replan','ambiguous','ready')),
    ambiguity_level     TEXT,
    plan_notes          TEXT,
    planned_at          TIMESTAMPTZ,
    plan_step_count     INTEGER,
    plan_risk           TEXT,
    plan_est_minutes    INTEGER
);

-- ============================================================
-- TABLE: task_dependencies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    dependent_id    INTEGER NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    dependency_id   INTEGER NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (dependent_id, dependency_id)
);

-- ============================================================
-- TABLE: task_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_history (
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    task_id     INTEGER NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    old_state   TEXT,
    new_state   TEXT NOT NULL,
    agent_id    TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes       TEXT
);

-- ============================================================
-- TABLE: task_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_notes (
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    task_id     INTEGER NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    note_type   TEXT NOT NULL DEFAULT 'general'
                    CHECK (note_type IN ('general','discovery','blocker','decision','review_comment')),
    body        TEXT NOT NULL,
    author      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved    INTEGER NOT NULL DEFAULT 0,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_state       ON public.tasks(state);
CREATE INDEX IF NOT EXISTS idx_tasks_priority    ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_roadmap_id  ON public.tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_tasks_plan_status ON public.tasks(plan_status, priority);
CREATE INDEX IF NOT EXISTS idx_history_task_id   ON public.task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_task   ON public.task_notes(task_id, resolved);

-- ============================================================
-- TRIGGER: auto-set updated_at on tasks
-- ============================================================
CREATE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can read tasks
CREATE POLICY "Authenticated users can read tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read task_dependencies"
    ON public.task_dependencies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read task_history"
    ON public.task_history FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read task_notes"
    ON public.task_notes FOR SELECT
    TO authenticated
    USING (true);

-- INSERT/UPDATE/DELETE: admin and superadmin only
CREATE POLICY "Admins can insert tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can manage task_dependencies"
    ON public.task_dependencies FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can insert task_history"
    ON public.task_history FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can manage task_notes"
    ON public.task_notes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );
