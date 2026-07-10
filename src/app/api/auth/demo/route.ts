import { NextResponse } from 'next/server'
import {
  DEMO_SESSION_COOKIE,
  DEMO_WELCOME_COOKIE,
  demoCookieOptions,
  demoWelcomeCookieOptions,
} from '@/lib/auth/demo-session'

/**
 * Start a demo session. Submitted by the "Try the live demo" form on /login.
 * Sets the session cookie and redirects into the app.
 *
 * Also drops a short-lived, client-readable "welcome" cookie so the dashboard
 * can show the artificial-data disclaimer exactly once, on this entry — not on
 * later navigations with an existing session.
 *
 * 303 See Other so the browser follows with a GET, not a repeat POST.
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 })
  response.cookies.set(DEMO_SESSION_COOKIE, '1', demoCookieOptions())
  response.cookies.set(DEMO_WELCOME_COOKIE, '1', demoWelcomeCookieOptions())
  return response
}
