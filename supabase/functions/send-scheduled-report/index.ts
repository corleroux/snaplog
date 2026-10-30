// Send Scheduled Report Edge Function
// Generates and emails scheduled reports.
// Called by a cron trigger, not by end users.
// Requires Authorization: Bearer <CRON_SECRET> where CRON_SECRET is a Supabase secret.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'

const log = createLogger('send-scheduled-report')

interface ScheduledReport {
  id: string
  name: string
  event_id: string
  report_config: ReportConfig
  recipients: string[]
  timezone: string
}

interface ReportConfig {
  dimensions: string[]
  metrics: string[]
  filters: Record<string, unknown>
  timeRange: string
}

serve(async (req) => {
  // Handle CORS using shared whitelist
  const cors = handleCors(req)
  if (cors) return cors

  // Verify cron secret — this function is triggered by a scheduler, not by user JWTs.
  // The caller must provide Authorization: Bearer <CRON_SECRET>.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    log.error('CRON_SECRET environment variable is not set')
    return json({ error: 'Service misconfigured' }, 500, req)
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!provided || provided !== cronSecret) {
    log.warn('Rejected request with invalid cron secret')
    return json({ error: 'Unauthorized' }, 401, req)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  try {
    // Get due reports
    const { data: dueReports, error: reportsError } = await supabase.rpc('get_due_reports')
    if (reportsError) throw reportsError

    if (!dueReports || dueReports.length === 0) {
      return json({ message: 'No reports due', processed: 0 }, 200, req)
    }

    let processed = 0
    let failed = 0

    for (const report of dueReports as ScheduledReport[]) {
      try {
        const { data: run, error: runError } = await supabase
          .from('report_runs')
          .insert({ scheduled_report_id: report.id, status: 'running' })
          .select()
          .single()

        if (runError) throw runError

        await generateReport(supabase, report)

        const { error: updateError } = await supabase
          .from('report_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            recipient_count: report.recipients.length
          })
          .eq('id', run.id)

        if (updateError) throw updateError

        await supabase.rpc('update_report_next_run', { p_report_id: report.id })

        processed++
      } catch (error) {
        log.error('Failed to process report', { reportId: report.id, error })
        failed++

        await supabase
          .from('report_runs')
          .update({ status: 'failed', error_message: (error as Error).message })
          .eq('scheduled_report_id', report.id)
          .eq('status', 'running')
      }
    }

    return json({ message: 'Reports processed', processed, failed, total: dueReports.length }, 200, req)
  } catch (error) {
    log.error('Error processing scheduled reports', { error })
    return json({ error: (error as Error).message }, 500, req)
  }
})

async function generateReport(
  supabase: ReturnType<typeof createClient>,
  report: ScheduledReport
): Promise<{ sent: number }> {
  const { report_config, event_id } = report

  const days = parseInt(report_config.timeRange?.replace('d', '') || '7', 10) || 7
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)

  const { data: eventData } = await supabase
    .from('events')
    .select('name, id')
    .eq('id', event_id)
    .single()

  const eventName = eventData?.name || 'Unknown Event'

  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event_id)

  const { count: styleCount } = await supabase
    .from('fabric_styles')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event_id)

  const { data: currentScans } = await supabase
    .from('scan_sessions')
    .select('vendor_id')
    .eq('event_id', event_id)
    .gte('created_at', startDate.toISOString())

  const currentScanCount = currentScans?.length || 0

  const { data: prevScans } = await supabase
    .from('scan_sessions')
    .select('vendor_id')
    .eq('event_id', event_id)
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', startDate.toISOString())

  const prevScanCount = prevScans?.length || 0

  const vendorScanMap: Record<string, number> = {}
  for (const scan of currentScans || []) {
    const vid = scan.vendor_id
    if (vid) {
      vendorScanMap[vid] = (vendorScanMap[vid] || 0) + 1
    }
  }

  const topVendorIds = Object.entries(vendorScanMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id)

  let topVendorsHtml = ''
  if (topVendorIds.length > 0) {
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('id, name')
      .in('id', topVendorIds)

    const vendorNameMap: Record<string, string> = {}
    for (const v of vendorData || []) {
      vendorNameMap[v.id] = v.name
    }

    topVendorsHtml = topVendorIds
      .map((id, i) => `<li>${i + 1}. ${vendorNameMap[id] || 'Unknown'} (${vendorScanMap[id]} scans)</li>`)
      .join('')
  }

  let deltaDisplay = 'No prior data'
  if (prevScanCount > 0) {
    const delta = currentScanCount - prevScanCount
    const deltaPct = Math.round((delta / prevScanCount) * 100)
    deltaDisplay = delta >= 0 ? `+${deltaPct}%` : `${deltaPct}%`
  }

  const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
  const rangeLabel = `${dateFormatter.format(startDate)} – ${dateFormatter.format(now)}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">${eventName}</h1>
      <p style="font-size: 14px; color: #666; margin: 0 0 24px;">${rangeLabel}</p>

      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700;">${vendorCount || 0}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">Vendors</div>
        </div>
        <div style="flex: 1; background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700;">${styleCount || 0}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">Styles</div>
        </div>
        <div style="flex: 1; background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700;">${currentScanCount}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">Scans (${deltaDisplay})</div>
        </div>
      </div>

      ${topVendorsHtml ? `
        <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px;">Top Vendors</h2>
        <ul style="padding-left: 20px; margin: 0 0 24px;">${topVendorsHtml}</ul>
      ` : ''}

      <a href="${Deno.env.get('SITE_URL') || 'https://tradefair-beta.vercel.app'}/events/${event_id}/analytics"
         style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        View Analytics
      </a>
    </div>
  `

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) throw new Error('RESEND_API_KEY environment variable is not set')

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Snaplog <noreply@tradefair-beta.vercel.app>',
      to: report.recipients,
      subject: `${eventName} — Report for ${rangeLabel}`,
      html,
    }),
  })

  if (!emailResponse.ok) {
    const errorBody = await emailResponse.text()
    throw new Error(`Resend API error: ${emailResponse.status} — ${errorBody}`)
  }

  return { sent: report.recipients.length }
}
