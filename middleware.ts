import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

type UserRole = "END_USER" | "RESELLER_ADMIN" | "SUPER_ADMIN"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // If no token, let NextAuth handle redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const userRole = token.role as UserRole

    // Protect /dashboard/* routes - require END_USER role or higher
    if (path.startsWith("/dashboard")) {
      if (!userRole) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
      return NextResponse.next()
    }

    // Protect /admin/* routes - require RESELLER_ADMIN role or higher
    if (path.startsWith("/admin")) {
      if (userRole !== "RESELLER_ADMIN" && userRole !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
      return NextResponse.next()
    }

    // Protect /superadmin/* routes - require SUPER_ADMIN role only
    if (path.startsWith("/superadmin")) {
      if (userRole !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
      return NextResponse.next()
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
    "/api/admin/:path*",
    "/api/superadmin/:path*",
  ],
}
