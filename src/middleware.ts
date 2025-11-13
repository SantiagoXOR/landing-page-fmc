import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Skip ALL requests with RSC parameters - this is critical for Next.js 14
    const url = req.nextUrl
    if (url.searchParams.has('_rsc')) {
      return NextResponse.next()
    }

    // Skip internal Next.js requests and static assets
    if (
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/api/auth') ||
      url.pathname.startsWith('/api/_next') ||
      url.pathname.startsWith('/monitoring') ||
      url.pathname.includes('__nextjs_original-stack-frame') ||
      url.pathname.startsWith('/favicon.ico') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.map') ||
      url.pathname.endsWith('.ico')
    ) {
      return NextResponse.next()
    }

    const token = req.nextauth.token
    const isAuth = !!token

    // Redirect authenticated users away from auth pages
    if (url.pathname.startsWith('/auth') && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Admin access control
    if (isAuth && url.pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow RSC requests
        if (req.nextUrl.searchParams.has('_rsc')) {
          return true
        }

        // Allow auth pages without token
        if (req.nextUrl.pathname.startsWith('/auth')) {
          return true
        }

        // Protected pages require token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Only match specific routes, exclude API routes and static files
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}
