/**
 * Printer Event Analytics Endpoint
 * Receives detailed events from OctoPrint plugin for analytics and order tracking
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { handlePrinterJobEvent } from "@/lib/printer-order-events";
import { buildPrinterHeartbeatUpdate } from "@/lib/printer-state";

interface PrinterEventPayload {
    printerId: string;
    event: string;
    timestamp: number;
    printerState?: string;
    temperatures?: {
        hotend?: number;
        hotendTarget?: number;
        bed?: number;
        bedTarget?: number;
    };
    printProgress?: {
        completion?: number;
        printTime?: number;
        printTimeLeft?: number;
    };
    payload?: {
        filename?: string;
        path?: string;
        origin?: string;
        fileSize?: number;
        printTime?: number;
        error?: string;
        reason?: string;
        consequence?: string;
        port?: string;
        baudrate?: number;
        firmwareName?: string;
        firmwareData?: Record<string, unknown>;
        movie?: string;
        movieBasename?: string;
        captureFile?: string;
        owner?: string;
        user?: string;
        progress?: number;
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: PrinterEventPayload = await request.json();
        const { printerId, event, timestamp, printerState, temperatures, printProgress, payload } = body;

        console.log(`[PrinterEvent] ${event} from printer ${printerId}`);

        // Validate printer exists
        const printer = await prisma.printer.findUnique({
            where: { id: printerId },
            select: { id: true, providerId: true, name: true },
        });

        if (!printer) {
            return NextResponse.json({ error: "Printer not found" }, { status: 404 });
        }

        // Store event for analytics (using PrinterEvent model if exists, or log for now)
        // For MVP, we'll log to console and handle critical events
        const eventData = {
            printerId,
            printerName: printer.name,
            event,
            timestamp: new Date(timestamp * 1000),
            printerState,
            temperatures,
            printProgress,
            payload,
        };

        console.log("[PrinterEvent] Full data:", JSON.stringify(eventData, null, 2));

        // Handle critical events that affect order status
        switch (event) {
            case "PrintDone":
                await handlePrinterJobEvent({
                    printerId,
                    event: "PrintDone",
                    payload: {
                        filename: payload?.filename,
                        time: payload?.printTime,
                    },
                    source: "api/printer/event",
                });
                break;

            case "PrintFailed":
                await handlePrinterJobEvent({
                    printerId,
                    event: "PrintFailed",
                    payload: {
                        filename: payload?.filename,
                        error: payload?.error,
                        reason: payload?.reason,
                    },
                    source: "api/printer/event",
                });
                break;

            case "PrintCancelled":
                await handlePrinterJobEvent({
                    printerId,
                    event: "PrintCancelled",
                    payload: {
                        filename: payload?.filename,
                        reason: payload?.reason,
                    },
                    source: "api/printer/event",
                });
                break;

            case "Error":
                await handlePrinterError(printerId, payload);
                break;

            case "Connected":
                await updatePrinterStatus(printerId, "ONLINE");
                break;

            case "Disconnected":
                await updatePrinterStatus(printerId, "OFFLINE");
                break;

            case "PrintProgress":
                // Log progress milestones for analytics
                console.log(`[PrinterEvent] Progress: ${payload?.progress}% on printer ${printer.name}`);
                break;

            default:
                // Other events are logged for analytics but don't trigger actions
                break;
        }

        // TODO: Store in PrinterEvent collection for historical analytics
        // await prisma.printerEvent.create({ data: eventData });

        return NextResponse.json({ success: true, event });

    } catch (error) {
        console.error("[PrinterEvent] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Handle printer Error event
 */
async function handlePrinterError(printerId: string, payload?: PrinterEventPayload["payload"]) {
    console.error(`[PrinterEvent] Printer ${printerId} error:`, payload);

    // Update printer status
    await updatePrinterStatus(printerId, "ERROR");

    // If there's an active print, it might have failed
    if (payload?.consequence === "cancel") {
        await handlePrinterJobEvent({
            printerId,
            event: "PrintFailed",
            payload: {
                error: payload?.error,
                reason: payload?.reason || payload?.consequence,
            },
            source: "api/printer/event:error",
        });
    }
}

/**
 * Update printer status in database
 */
async function updatePrinterStatus(printerId: string, status: "ONLINE" | "OFFLINE" | "ERROR") {
    const printer = await prisma.printer.findUnique({
        where: { id: printerId },
        select: { isAcceptingOrders: true },
    });

    if (!printer) {
        return;
    }

    await prisma.printer.update({
        where: { id: printerId },
        data: buildPrinterHeartbeatUpdate(status, printer.isAcceptingOrders),
    });
}
