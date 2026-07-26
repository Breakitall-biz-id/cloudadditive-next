import { prisma } from "@/lib/prisma"
import { triggerProviderEvent, PrinterStatus } from "@/lib/pusher"
import { NextRequest, NextResponse } from "next/server"
import { PrinterStatus as PrismaStatus, Prisma } from "@prisma/client"
import { handlePrinterJobEvent } from "@/lib/printer-order-events"
import { buildPrinterHeartbeatUpdate } from "@/lib/printer-state"
import { markPrinterOrderStarted } from "@/lib/printer-job-linking"

// Extended PrinterStatus with event info
interface PrinterStatusWithEvent extends PrinterStatus {
    event?: "PrintStarted" | "PrintDone" | "PrintFailed" | "PrintCancelled";
    eventPayload?: {
        filename?: string;
        time?: number; // Print time in seconds
    };
}

/**
 * OctoPrint plugin calls this to update printer status.
 * This endpoint receives status from plugin and broadcasts to provider dashboard.
 * 
 * Request: POST with PrinterStatus object
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as PrinterStatusWithEvent
        const { printerId, state, progress, temps, currentJob, webcamUrl, event, eventPayload } = body

        // Log incoming request for debugging
        console.log(`[PrinterStatus] Received status update:`, {
            printerId,
            state,
            progress,
            event,
            temps,
            hasCurrentJob: !!currentJob,
        })

        // Validate printer exists
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            select: { id: true, providerId: true, isAcceptingOrders: true }
        })

        if (!printer) {
            return NextResponse.json(
                { error: "Printer not found" },
                { status: 404 }
            )
        }

        // Map plugin state to Prisma enum
        const statusMap: Record<string, PrismaStatus> = {
            idle: "ONLINE",
            printing: "PRINTING",
            pausing: "PAUSED",  // Transitioning to paused
            paused: "PAUSED",
            canceling: "ONLINE", // Transitioning to cancelled
            cancelled: "ONLINE", // Print was cancelled, back to online
            error: "ERROR",
            offline: "OFFLINE",
        }

        const nextStatus = statusMap[state]
        if (!nextStatus) {
            return NextResponse.json(
                { error: `Unsupported printer state: ${state}` },
                { status: 400 }
            )
        }

        const stateUpdate = buildPrinterHeartbeatUpdate(
            nextStatus,
            printer.isAcceptingOrders
        )

        const linkedJob = nextStatus === "PRINTING"
            ? await markPrinterOrderStarted({
                printerId,
                jobId: currentJob?.id,
                filename: currentJob?.filename,
                timeRemaining: currentJob?.timeRemaining ?? null,
                progress: progress ?? 0,
                source: "api/printer/status",
            })
            : null;
        const effectiveCurrentJob = currentJob || (linkedJob ? {
            id: linkedJob.id,
            filename: linkedJob.filename,
            timeRemaining: linkedJob.timeRemaining,
        } : null);

        const printerUpdateData: Prisma.PrinterUpdateInput = {
            ...stateUpdate,
            webcamUrl: webcamUrl || null,
            // Save last known temperatures for persistence
            lastTemperatures: temps ? {
                hotend: temps.hotend || temps.tool0 || 0,
                bed: temps.bed || 0,
            } : undefined,
        };

        if (effectiveCurrentJob) {
            printerUpdateData.currentJobId = effectiveCurrentJob.id;
            printerUpdateData.lastJobInfo = {
                id: effectiveCurrentJob.id,
                filename: effectiveCurrentJob.filename,
                progress: progress || 0,
                timeRemaining: effectiveCurrentJob.timeRemaining || null,
            };
        } else if (nextStatus !== "PRINTING") {
            printerUpdateData.currentJobId = null;
        }

        // Update printer status in database. Do not clear currentJobId/lastJobInfo when
        // a printing heartbeat omits currentJob; some plugins send progress separately.
        await prisma.printer.update({
            where: { id: printerId },
            data: printerUpdateData,
        })

        // Handle print completion events - update order status with shared transition rules
        if (event === "PrintDone" || event === "PrintFailed" || event === "PrintCancelled") {
            await handlePrinterJobEvent({
                printerId,
                event,
                payload: eventPayload,
                source: "api/printer/status",
            })
        }

        // Broadcast status to provider dashboard via Pusher
        await triggerProviderEvent(printer.providerId, "printer:status", {
            printerId,
            state,
            progress,
            temps,
            currentJob: effectiveCurrentJob,
            webcamUrl,
            event,
            timestamp: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Printer status update error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
