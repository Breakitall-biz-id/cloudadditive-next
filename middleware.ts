import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { getDashboardPathForRole } from "@/lib/role-redirect"

// Routes that require authentication
const protectedRoutes = [
    "/dashboard",
    "/provider/dashboard",
    "/admin",
    "/order",
]

// Routes only accessible to unauthenticated users
const authRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
]

// Public routes that don't need any check
const publicRoutes = [
    "/",
    "/api",
    "/_next",
    "/favicon.ico",
]

export default auth((request) => {
    const { pathname } = request.nextUrl
    const isLoggedIn = !!request.auth

    // Skip public routes and static files
    if (publicRoutes.some(route => pathname.startsWith(route)) || pathname.includes(".")) {
        // But don't skip if it's an auth route
        if (!authRoutes.some(route => pathname.startsWith(route))) {
            return NextResponse.next()
        }
    }

    // If user is logged in and trying to access auth routes (login/register)
    // Redirect them to dashboard
    if (isLoggedIn && authRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL(getDashboardPathForRole(request.auth?.user?.role), request.url))
    }

    // If user is NOT logged in and trying to access protected routes
    // Redirect them to login
    if (!isLoggedIn && protectedRoutes.some(route => pathname.startsWith(route))) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes that handle their own auth (pusher, webhooks, etc.)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         * - public files (images, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
