/**
 * Presence-based gate for the demo. This is not real authentication — the app
 * serves shared sandbox data and has no per-user state. The cookie only records
 * that a visitor entered through the front door ("Try the live demo") rather
 * than deep-linking straight into the dashboard. Keep expectations there.
 */
export const DEMO_SESSION_COOKIE = 'demo_session'

/** Cookie is httpOnly so the dead client-side login form can't forge it. */
export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
}

/**
 * One-shot flag that the dashboard reads to show the artificial-data disclaimer
 * on demo entry, then clears. Deliberately NOT httpOnly — the client reads and
 * deletes it. Short TTL so a stale flag can't resurface the modal later.
 */
export const DEMO_WELCOME_COOKIE = 'demo_welcome'

export function demoWelcomeCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 5, // 5 minutes
  }
}
