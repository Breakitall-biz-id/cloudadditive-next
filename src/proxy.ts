import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Basic middleware to keep session alive and handle protected routes if needed
export default auth((req) => {
    // req.auth
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')

    if (isOnDashboard && !isLoggedIn) {
        return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
})

export const config = {
    // Match keys usually exclude static files and api routes that don't need auth
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
