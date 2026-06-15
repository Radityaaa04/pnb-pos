import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // Define restricted routes
  const isAuthRoute = url.pathname.startsWith('/login')
  const isProtected = ['/pos', '/dashboard', '/inventory', '/history', '/vouchers', '/settings'].some(route => url.pathname.startsWith(route))

  if (isProtected && !user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    url.pathname = '/pos'
    return NextResponse.redirect(url)
  }

  // Also redirect from root to /pos or /login
  if (url.pathname === '/') {
      url.pathname = user ? '/pos' : '/login'
      return NextResponse.redirect(url)
  }

  if (user) {
    // Check role for owner routes
    const ownerRoutes = ['/dashboard', '/inventory', '/vouchers', '/settings']
    const isOwnerRoute = ownerRoutes.some(route => url.pathname.startsWith(route))

    if (isOwnerRoute) {
      // fetch user role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      
      if (profile?.role !== 'owner') {
        url.pathname = '/pos' // Redirect back to pos if kasir tries to access admin routes
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
