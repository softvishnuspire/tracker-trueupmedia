import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can make it very hard to debug
  // issues with users being logged out.

  try {
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null }; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error('Middleware auth timeout') }), 2500)
    )

    await Promise.race([authPromise, timeoutPromise])
  } catch (_err) {
    // Fail-safe handling to ensure request is never blocked if Supabase Auth is slow or unresponsive
  }

  return supabaseResponse
}
