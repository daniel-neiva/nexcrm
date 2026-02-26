import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
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

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()
    const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/register') || url.pathname === '/'

    // Allow public API and static files
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next') || url.pathname.includes('.')) {
        return supabaseResponse
    }

    if (user && isAuthRoute) {
        // Logged-in users shouldn't see the login page or landing page, send them to dashboard
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    if (!user && !isAuthRoute) {
        // Unauthenticated users trying to access private routes
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
