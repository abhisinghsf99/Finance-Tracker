import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session'

/**
 * Anonymous visitor id for the visit log. Long-lived (not per-browsing-session)
 * so a returning visitor keeps the same id — the point is deduping foot
 * traffic, not tracking behavior. httpOnly: nothing client-side needs it.
 */
const VISITOR_COOKIE = 'visitor_id'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  }
}

/**
 * Vercel URL-encodes geo header values (e.g. "S%C3%A3o%20Paulo").
 */
function decodeGeoHeader(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * The raw query string minus Next.js's internal _rsc param (client-side
 * navigations append it to RSC fetches; it's noise in the visit log).
 */
function cleanQueryParams(request: NextRequest): string | null {
  const params = new URLSearchParams(request.nextUrl.search)
  params.delete('_rsc')
  const query = params.toString()
  return query.length > 0 ? query : null
}

/**
 * Record city + timestamp for every page load, using the geo headers Vercel
 * attaches to incoming requests. Fire-and-forget via waitUntil so the visitor
 * never waits on the insert; locally (no geo headers) rows just have nulls,
 * and without Supabase env vars this is a no-op.
 */
function logVisit(request: NextRequest, event: NextFetchEvent, sessionId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  const headers = request.headers
  event.waitUntil(
    fetch(`${url}/rest/v1/page_visits`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        session_id: sessionId,
        path: request.nextUrl.pathname,
        city: decodeGeoHeader(headers.get('x-vercel-ip-city')),
        region: decodeGeoHeader(headers.get('x-vercel-ip-country-region')),
        country: headers.get('x-vercel-ip-country'),
        referrer: headers.get('referer'),
        user_agent: headers.get('user-agent'),
        utm_source: request.nextUrl.searchParams.get('utm_source'),
        query_params: cleanQueryParams(request),
      }),
    }).catch(() => {
      // Never let visit logging affect the actual response.
    })
  )
}

/**
 * Gate every page route behind the demo session cookie. The only way to obtain
 * it is POST /api/auth/demo, which the "Try the live demo" button submits.
 * Direct navigation to the dashboard without it bounces to /login.
 *
 * API routes are intentionally excluded (see matcher): the data endpoints are
 * public sandbox data, and the cron/seed routes carry their own CRON_SECRET.
 */
export function middleware(request: NextRequest, event: NextFetchEvent) {
  // Validate the inbound cookie: it lands in the visit log, so a tampered
  // value gets replaced rather than stored.
  const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value
  const visitorId =
    existingVisitorId && UUID_PATTERN.test(existingVisitorId)
      ? existingVisitorId
      : crypto.randomUUID()

  logVisit(request, event, visitorId)

  const hasSession = request.cookies.has(DEMO_SESSION_COOKIE)
  const { pathname } = request.nextUrl

  let response: NextResponse
  if (pathname === '/login') {
    // Don't show the door to someone already inside.
    response = hasSession
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next()
  } else if (!hasSession) {
    response = NextResponse.redirect(new URL('/login', request.url))
  } else {
    response = NextResponse.next()
  }

  if (visitorId !== existingVisitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions())
  }

  return response
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
