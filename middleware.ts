import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')
    const isLoginPage = request.nextUrl.pathname === '/login'

    // Public paths that don't need authentication
    // We exclude /api because some might be public, but for this app generally we want protection
    // However, user asked for login protection, so generally protecting everything is safer
    // Excluding static files and images
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|ico|svg)$/)
    ) {
        return NextResponse.next()
    }

    // If user is logged in and tries to access login page, redirect to home
    if (token && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // If user is not logged in and tries to access protected page, redirect to login
    if (!token && !isLoginPage) {
        const response = NextResponse.redirect(new URL('/login', request.url))
        // Clear any invalid cookies just in case
        response.cookies.delete('auth_token')
        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
