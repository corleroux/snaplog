export class SupabaseApiError extends Error {
  readonly status: number
  readonly method: string
  readonly path: string
  readonly supabaseCode?: string
  readonly supabaseHint?: string
  readonly fingerprint: string

  constructor(opts: {
    status: number
    method: string
    path: string
    message: string
    supabaseCode?: string
    supabaseHint?: string
  }) {
    super(opts.message)
    this.name = 'SupabaseApiError'
    this.status = opts.status
    this.method = opts.method
    this.path = opts.path
    this.supabaseCode = opts.supabaseCode
    this.supabaseHint = opts.supabaseHint
    this.fingerprint = `supabase:${opts.status}:${opts.method}:${opts.path}`
  }
}

export class AuthSessionError extends Error {
  readonly stage: 'init' | 'refresh' | 'expired' | 'unknown'

  constructor(message: string, stage: AuthSessionError['stage']) {
    super(message)
    this.name = 'AuthSessionError'
    this.stage = stage
  }
}

export class ApplicationError extends Error {
  readonly feature: string
  readonly context?: Record<string, unknown>

  constructor(message: string, feature: string, context?: Record<string, unknown>) {
    super(message)
    this.name = 'ApplicationError'
    this.feature = feature
    this.context = context
  }
}
