-- Extend audit_log CHECK constraints to support email audit actions
--
-- The send-email-catalogue function records audit entries with action='email_sent'
-- which was not included in the original constraint set. This migration extends
-- both CHECK constraints to cover email-related values without breaking existing data.

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_entity_type_check,
  ADD CONSTRAINT audit_log_entity_type_check
    CHECK (entity_type IN ('vendor', 'fabric_style', 'fabric_variant', 'fabric_image', 'event', 'email'));

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_action_check,
  ADD CONSTRAINT audit_log_action_check
    CHECK (action IN ('create', 'update', 'archive', 'delete', 'ERROR', 'email_sent'));
