-- Migration 080: Widen the classification CHECK on public.tasks
-- The SQLite task database used 13 classification values; migration 079 only allowed 4.
-- This widens the constraint to accept the full union taxonomy, preserving rich data
-- from the legacy SQLite system without lossy mapping.
-- STAGING ONLY: deploy with supabase db push --project-ref sqshnzkgqdoiocnaunpu

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_classification_check;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_classification_check
    CHECK (classification IN (
        'defect',
        'enhancement',
        'new_feature',
        'alignment_issue',
        'feature',
        'bug',
        'debt',
        'test',
        'infra',
        'security',
        'observability',
        'reporting',
        'chore'
    ));
