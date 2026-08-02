import { prisma } from "@/lib/prisma"
import { triggerPrinterEvent } from "@/lib/pusher"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { loadMatchingConfig } from "@/lib/printer-matching/runtime-config"
import { getPrinterStartBlockReason } from "@/lib/printer-state"
import { startPrinterOrder } from "@/lib/printer-dispatch"

/**
 * Send commands to OctoPrint printer via Pusher.
 * 
 * Provider dashboard calls this to control printers remotely.
 * Commands are sent via Pusher to the OctoPrint plugin.
 * 
 * Supported commands:
 * - job:start - Start printing a job
 * - job:pause - Pause current job
 * - job:resume - Resume paused job
 * - job:cancel - Cancel current job
 */
export async function POST(request: NextRequest) {
    const session = await auth()

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { printerId, command, payload } = body

        if (!printerId || !command) {
            return NextResponse.json(
                { error: "Missing printerId or command" },
                { status: 400 }
            )
        }

        // Verify printer exists and user owns it
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            include: {
                provider: {
                    include: { user: true }
                }
            }
        })

        if (!printer) {
            return NextResponse.json(
                { error: "Printer not found" },
                { status: 404 }
            )
        }

        if (printer.provider.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Unauthorized - not your printer" },
                { status: 403 }
            )
        }

        // Validate command
        const validCommands = ["job:start", "job:pause", "job:resume", "job:cancel"]
        if (!validCommands.includes(command)) {
            return NextResponse.json(
                { error: `Invalid command. Must be one of: ${validCommands.join(", ")}` },
                { status: 400 }
            )
        }

        if (command === "job:start") {
            const orderId = payload?.orderId || payload?.jobId

            if (orderId) {
                const result = await startPrinterOrder(orderId, {
                    providerId: printer.providerId,
                    changedBy: printer.providerId,
                    source: "printer-command",
                })

                if (!result.success) {
                    return NextResponse.json(
                        { error: result.error || "Failed to start print" },
                        { status: 409 }
                    )
                }

                return NextResponse.json({
                    success: true,
                    message: result.message || `Print command sent to ${printer.name}`
                })
            }

            const config = await loadMatchingConfig()
            const startBlockReason = getPrinterStartBlockReason(
                printer,
                new Date(),
                config.heartbeatTimeoutSeconds
            )
            if (startBlockReason) {
                return NextResponse.json(
                    { error: startBlockReason },
                    { status: 409 }
                )
            }
        }

        // Send non-order control commands to the plugin via Pusher.
        await triggerPrinterEvent(printerId, command, payload || {})

        console.log(`[Printer Command] ${command} sent to printer ${printerId}`, payload)

        return NextResponse.json({
            success: true,
            message: `Command ${command} sent to printer ${printer.name}`
        })
    } catch (error) {
        console.error("Printer command error:", error)
        return NextResponse.json(
            { error: "Failed to send command" },
            { status: 500 }
        )
    }
}
