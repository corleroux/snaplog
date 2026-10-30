-- T22: Add version columns for optimistic concurrency control
--
-- Each update to vendors, fabric_styles, or fabric_variants must
-- include the expected version. The version is incremented on
-- every successful update, preventing lost updates when two users
-- edit the same record concurrently.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE fabric_styles ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE fabric_variants ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
