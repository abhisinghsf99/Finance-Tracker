import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session'

/**
 * Gate every page route behind the demo session cookie. The only way to obtain
 * it is POST /api/auth/demo, which the "Try the live demo" button submits.
 * Direct navigation to the dashboard without it bounces to /login.
 *
 * API routes are intentionally excluded (see matcher): the data endpoints are
 * public sandbox data, and the cron/seed routes carry their own CRON_SECRET.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(DEMO_SESSION_COOKIE)
  const { pathname } = request.nextUrl

  if (pathname === '/login') {
    // Don't show the door to someone already inside.
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
