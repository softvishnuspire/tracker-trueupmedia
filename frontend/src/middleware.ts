import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 1. Bypass Next.js router prefetch requests to prevent auth call spikes on hover/scroll
  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1' ||
    request.headers.get('next-router-prefetch') === '1'

  if (isPrefetch) {
    return NextResponse.next()
  }

  // 2. Bypass API routes - API endpoints handle their own token authentication
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files & assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|csv|txt|xml|mp4|mp3|pdf|webmanifest|map)$).*)',
  ],
}

