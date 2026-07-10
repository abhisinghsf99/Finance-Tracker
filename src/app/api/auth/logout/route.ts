import { NextResponse } from 'next/server'
import { DEMO_SESSION_COOKIE, demoCookieOptions } from '@/lib/auth/demo-session'

/**
 * End a demo session. Submitted by the "Exit demo" control in the top nav.
 * Clears the cookie and returns to /login.
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  response.cookies.set(DEMO_SESSION_COOKIE, '', { ...demoCookieOptions(), maxAge: 0 })
  return response
}
