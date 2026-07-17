import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Also excludes the PWA install surface (manifest, generated icons, the
    // no-op service worker) — browsers/OS fetch these unauthenticated, so
    // redirecting them to /login broke installability. api/ is excluded too —
    // Vercel Cron calls app/api/cron/** with no browser session/cookies at
    // all, so routing those through the page-auth-redirect logic would 307
    // every cron invocation straight to /login instead of ever running the
    // route handler. Those routes authenticate themselves via CRON_SECRET.
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|icon$|apple-icon$|icons/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
