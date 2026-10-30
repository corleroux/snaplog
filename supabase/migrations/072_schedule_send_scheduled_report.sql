-- Schedule send-scheduled-report edge function to run every hour
-- Cron expression: 0 * * * * (every hour at minute 0)
-- Uses net.http_post to invoke the edge function via Supabase's built-in net extension

SELECT cron.schedule(
  'send-scheduled-report',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('supabase_functions_endpoint') || '/send-scheduled-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
