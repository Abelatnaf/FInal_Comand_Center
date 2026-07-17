import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and getClaims() — a mistake
  // here can make it very hard to debug users being randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isPublicRoute = isAuthRoute || pathname.startsWith('/privacy') || pathname.startsWith('/terms')
  const isMfaChallengeRoute = pathname.startsWith('/mfa-challenge')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // MFA step-up gate: if this session is only aal1 but the user has a
  // verified TOTP factor (so aal2 is reachable), force the challenge
  // before letting them anywhere else in the app. getAuthenticatorAssuranceLevel()
  // reads from getSession() under the hood rather than the verified
  // getClaims() above — normally avoided here on purpose — but identity
  // was already confirmed via getClaims() this request, so this call is
  // only ever used to read the aal claim off a session we've already
  // validated belongs to a real user, not to establish who they are.
  // This is also a UX gate, not the data boundary: RLS scopes every table
  // by user_id regardless of aal, so the worst case of someone bypassing
  // this redirect is the same as if they'd never turned MFA on for that
  // one request — not a data leak.
  if (user && !isPublicRoute && !isMfaChallengeRoute) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa-challenge'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
