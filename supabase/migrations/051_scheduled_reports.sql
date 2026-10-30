-- Scheduled Reports Migration
-- Supports scheduling of automated reports with email delivery

-- Create scheduled_reports table
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_config JSONB NOT NULL, -- Saved report configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_day_of_week INTEGER CHECK (schedule_day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  schedule_day_of_month INTEGER CHECK (schedule_day_of_month BETWEEN 1 AND 31),
  schedule_hour INTEGER NOT NULL CHECK (schedule_hour BETWEEN 0 AND 23),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  recipients TEXT[] NOT NULL, -- Array of email addresses
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for looking up scheduled reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_event ON public.scheduled_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON public.scheduled_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON public.scheduled_reports(is_active, next_run_at) WHERE is_active = true;

-- Create report_runs table for tracking report execution history
CREATE TABLE IF NOT EXISTS public.report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID NOT NULL REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  file_url TEXT, -- URL to generated report file
  recipient_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for looking up report runs
CREATE INDEX IF NOT EXISTS idx_report_runs_scheduled_report ON public.report_runs(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON public.report_runs(status);
CREATE INDEX IF NOT EXISTS idx_report_runs_created_at ON public.report_runs(created_at);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_reports
-- Users can view scheduled reports for events they have access to
CREATE POLICY "Users can view scheduled reports on accessible events"
  ON public.scheduled_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.user_id = auth.uid()
      AND event_members.event_id = scheduled_reports.event_id
    )
    OR created_by = auth.uid()
  );

-- Users can create scheduled reports for events they have access to
CREATE POLICY "Users can create scheduled reports on accessible events"
  ON public.scheduled_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.user_id = auth.uid()
      AND event_members.event_id = event_id
    )
    AND created_by = auth.uid()
  );

-- Users can update their own scheduled reports
CREATE POLICY "Users can update own scheduled reports"
  ON public.scheduled_reports
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own scheduled reports
CREATE POLICY "Users can delete own scheduled reports"
  ON public.scheduled_reports
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for report_runs
-- Users can view report runs for scheduled reports they have access to
CREATE POLICY "Users can view report runs on accessible scheduled reports"
  ON public.report_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_reports
      WHERE scheduled_reports.id = report_runs.scheduled_report_id
      AND (
        EXISTS (
          SELECT 1 FROM public.event_members
          WHERE event_members.user_id = auth.uid()
          AND event_members.event_id = scheduled_reports.event_id
        )
        OR scheduled_reports.created_by = auth.uid()
      )
    )
  );

-- Service role can insert report runs (from edge function)
CREATE POLICY "Service role can insert report runs"
  ON public.report_runs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update report runs (from edge function)
CREATE POLICY "Service role can update report runs"
  ON public.report_runs
  FOR UPDATE
  TO service_role
  WITH CHECK (true);

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION public.calculate_next_run(
  p_schedule_type TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_hour INTEGER,
  p_timezone TEXT,
  p_from_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_time TIMESTAMPTZ;
  v_from_time TIMESTAMPTZ;
BEGIN
  -- Convert from_time to the specified timezone
  v_from_time := p_from_time AT TIME ZONE p_timezone;

  CASE p_schedule_type
    WHEN 'daily' THEN
      -- Next day at specified hour
      v_next_time := v_from_time + INTERVAL '1 day';
      v_next_time := date_trunc('day', v_next_time) + INTERVAL '1 hour' * p_hour;

    WHEN 'weekly' THEN
      -- Next occurrence of specified day of week at specified hour
      v_next_time := v_from_time + INTERVAL '1 day';
      WHILE EXTRACT(DOW FROM v_next_time) != p_day_of_week LOOP
        v_next_time := v_next_time + INTERVAL '1 day';
      END LOOP;
      v_next_time := date_trunc('day', v_next_time) + INTERVAL '1 hour' * p_hour;

    WHEN 'monthly' THEN
      -- Next occurrence of specified day of month at specified hour
      v_next_time := v_from_time + INTERVAL '1 month';
      v_next_time := date_trunc('month', v_next_time) + INTERVAL '1 day' * (p_day_of_month - 1);
      v_next_time := v_next_time + INTERVAL '1 hour' * p_hour;

      -- Handle case where day is beyond month end (use last day)
      IF EXTRACT(DAY FROM v_next_time) != p_day_of_month THEN
        v_next_time := date_trunc('month', v_next_time + INTERVAL '1 month') - INTERVAL '1 day';
        v_next_time := date_trunc('day', v_next_time) + INTERVAL '1 hour' * p_hour;
      END IF;
  END CASE;

  -- Convert back to UTC
  RETURN v_next_time AT TIME ZONE 'UTC';
END;
$$;

-- Function to create a scheduled report
CREATE OR REPLACE FUNCTION public.create_scheduled_report(
  p_name TEXT,
  p_description TEXT,
  p_event_id UUID,
  p_report_config JSONB,
  p_schedule_type TEXT,
  p_hour INTEGER,
  p_recipients TEXT[],
  p_timezone TEXT DEFAULT 'UTC',
  p_day_of_week INTEGER DEFAULT NULL,
  p_day_of_month INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_report_id UUID;
  v_next_run TIMESTAMPTZ;
BEGIN
  -- Calculate first run time
  v_next_run := public.calculate_next_run(
    p_schedule_type,
    p_day_of_week,
    p_day_of_month,
    p_hour,
    p_timezone,
    NOW() AT TIME ZONE p_timezone
  );

  -- Create the scheduled report
  INSERT INTO public.scheduled_reports (
    name,
    description,
    event_id,
    created_by,
    report_config,
    schedule_type,
    schedule_day_of_week,
    schedule_day_of_month,
    schedule_hour,
    timezone,
    recipients,
    next_run_at
  ) VALUES (
    p_name,
    p_description,
    p_event_id,
    auth.uid(),
    p_report_config,
    p_schedule_type,
    p_day_of_week,
    p_day_of_month,
    p_hour,
    p_timezone,
    p_recipients,
    v_next_run
  ) RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- Function to update next run time after a report runs
CREATE OR REPLACE FUNCTION public.update_report_next_run(
  p_report_id UUID
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_report RECORD;
  v_next_run TIMESTAMPTZ;
BEGIN
  -- Get the scheduled report
  SELECT * INTO v_report
  FROM public.scheduled_reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scheduled report not found';
  END IF;

  -- Calculate next run time
  v_next_run := public.calculate_next_run(
    v_report.schedule_type,
    v_report.schedule_day_of_week,
    v_report.schedule_day_of_month,
    v_report.schedule_hour,
    v_report.timezone,
    NOW() AT TIME ZONE v_report.timezone
  );

  -- Update the scheduled report
  UPDATE public.scheduled_reports
  SET
    last_run_at = NOW(),
    next_run_at = v_next_run,
    updated_at = NOW()
  WHERE id = p_report_id;

  RETURN v_next_run;
END;
$$;

-- Function to get scheduled reports that need to run
CREATE OR REPLACE FUNCTION public.get_due_reports()
RETURNS TABLE (
  id UUID,
  name TEXT,
  event_id UUID,
  report_config JSONB,
  recipients TEXT[],
  timezone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.name,
    sr.event_id,
    sr.report_config,
    sr.recipients,
    sr.timezone
  FROM public.scheduled_reports sr
  WHERE sr.is_active = true
    AND sr.next_run_at <= NOW()
  ORDER BY sr.next_run_at ASC;
END;
$$;

-- Function to update scheduled report timestamp
CREATE OR REPLACE FUNCTION public.update_scheduled_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scheduled_report_timestamp();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_next_run TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_scheduled_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_report_next_run TO service_role;
GRANT EXECUTE ON FUNCTION public.get_due_reports TO service_role;
