import { auth } from "@/lib/auth"
import { pusherServer } from "@/lib/pusher"
import { NextRequest, NextResponse } from "next/server"

/**
 * Pusher authentication endpoint for private channels.
 * 
 * Supports two types of clients:
 * 1. OctoPrint Plugin - subscribes to private-printer-{printerId} (no auth required)
 * 2. Provider Dashboard - subscribes to private-provider-{providerId} (requires session)
 */
export async function POST(request: NextRequest) {
    try {
        let socketId: string | null = null
        let channel: string | null = null

        const contentType = request.headers.get("content-type") || ""

        if (contentType.includes("application/json")) {
            const json = await request.json()
            socketId = json.socket_id
            channel = json.channel_name
        } else {
            // Fallback to form data (standard Pusher client behavior)
            const formData = await request.formData()
            socketId = formData.get("socket_id") as string
            channel = formData.get("channel_name") as string
        }

        console.log("[Pusher Auth] Request received:", { socketId, channel, contentType })

        if (!socketId || !channel) {
            console.error("[Pusher Auth] Missing parameters")
            return NextResponse.json(
                { error: "Missing socket_id or channel_name" },
                { status: 400 }
            )
        }

        // Allow OctoPrint plugins to subscribe to their printer channel
        // No session required - plugin authenticates via connection token in /api/printer/connect
        if (channel.startsWith("private-printer-")) {
            console.log("[Pusher Auth] Authorizing printer channel:", channel)
            const authResponse = pusherServer.authorizeChannel(socketId, channel)
            return NextResponse.json(authResponse)
        }

        // Provider dashboard channels require authentication
        if (channel.startsWith("private-provider-")) {
            const session = await auth()
            console.log("[Pusher Auth] Session check for provider channel:", {
                channel,
                hasSession: !!session,
                userId: session?.user?.id
            })

            if (!session?.user?.id) {
                console.error("[Pusher Auth] Unauthorized - no session")
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                )
            }

            // TODO: Verify user owns this provider
            console.log("[Pusher Auth] Authorizing provider channel:", channel)
            const authResponse = pusherServer.authorizeChannel(socketId, channel)
            return NextResponse.json(authResponse)
        }

        console.error("[Pusher Auth] Unauthorized channel type:", channel)
        return NextResponse.json(
            { error: "Unauthorized channel" },
            { status: 403 }
        )
    } catch (error) {
        console.error("[Pusher Auth] Error:", error)
        return NextResponse.json(
            { error: "Authentication failed" },
            { status: 500 }
        )
    }
}
