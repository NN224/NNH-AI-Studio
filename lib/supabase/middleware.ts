import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const publicRoutes = ["/", "/privacy", "/terms", "/about", "/contact", "/pricing"]
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname === route)
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth")
  
  let user = null
  
  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()
    
    if (error) {
      // Only log errors for protected routes (not public or auth routes)
      if (!isPublicRoute && !isAuthRoute) {
        console.error("Auth error in middleware:", error)
      }
      
      // If session expired or invalid, clear cookies and redirect to login (only for protected routes)
      if (error.message?.includes("session") || error.message?.includes("expired") || error.message?.includes("Invalid")) {
        if (!isPublicRoute && !isAuthRoute) {
          const url = request.nextUrl.clone()
          url.pathname = "/auth/login"
          const response = NextResponse.redirect(url)
          
          // Clear auth cookies
          response.cookies.delete("sb-access-token")
          response.cookies.delete("sb-refresh-token")
          
          return response
        }
      }
    }
    
    user = authUser
  } catch (error) {
    // Only log critical errors for protected routes
    if (!isPublicRoute && !isAuthRoute) {
      console.error("Middleware authentication error:", error)
    }
    // On any auth error, treat as unauthenticated
    user = null
  }

  // Redirect to login if not authenticated and trying to access protected routes
  if (!user && !request.nextUrl.pathname.startsWith("/auth") && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Redirect to home if authenticated and trying to access auth pages (except signout)
  if (user && request.nextUrl.pathname.startsWith("/auth") && !request.nextUrl.pathname.startsWith("/auth/signout")) {
    const url = request.nextUrl.clone()
    url.pathname = "/home"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
