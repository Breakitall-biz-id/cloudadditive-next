import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// CORS headers for OctoPrint plugin
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cache-Control, X-Requested-With",
}

/**
 * Handle CORS preflight request
 */
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * OctoPrint plugin calls this to authenticate and get connection info.
 * 
 * Request: POST with { token: string }
 * Response: { success: true, printerId: string, pusherKey: string, pusherCluster: string, channel: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token } = body

        if (!token) {
            return NextResponse.json(
                { error: "Missing connection token" },
                { status: 400, headers: corsHeaders }
            )
        }

        // Find printer by connection token
        const printer = await prisma.printer.findFirst({
            where: { connectionToken: token },
            include: { provider: true }
        })

        if (!printer) {
            return NextResponse.json(
                { error: "Invalid connection token" },
                { status: 401, headers: corsHeaders }
            )
        }

        // Update last seen timestamp
        await prisma.printer.update({
            where: { id: printer.id },
            data: { lastSeenAt: new Date() }
        })

        return NextResponse.json({
            success: true,
            printerId: printer.id,
            printerName: printer.name,
            providerId: printer.providerId,
            // Pusher connection info
            pusherKey: process.env.NEXT_PUBLIC_PUSHER_KEY,
            pusherCluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
            // Channel to subscribe for receiving commands
            commandChannel: `private-printer-${printer.id}`,
            // Channel to send status updates (provider dashboard)
            statusChannel: `private-provider-${printer.providerId}`,
        }, { headers: corsHeaders })
    } catch (error) {
        console.error("Printer connect error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500, headers: corsHeaders }
        )
    }
}
