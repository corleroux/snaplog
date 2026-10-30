/**
 * Escapes user-controlled strings before interpolating them into HTML.
 * Apply to any value that originates from user input (event names, vendor names, etc.)
 * before embedding it in an email template or HTML response.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
