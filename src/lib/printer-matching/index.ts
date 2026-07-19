/**
 * Printer Matching Algorithm
 * Finds the best printer for an order based on distance, queue time, and material
 */

import { prisma } from "@/lib/prisma";
import { startOrderPrint } from "@/lib/octoprint";
import { printerMatchingService } from "./service";
import { loadMatchingConfig } from "./runtime-config";
import { getPrinterStartBlockReason } from "@/lib/printer-state";
import type { PrinterScore } from "./types";
export { DEFAULT_WEIGHTS } from "./types";
export type { PrinterScore, MatchingWeights } from "./types";

export type QueueProcessingPrinter = {
    id: string;
    status: string;
    isAcceptingOrders: boolean;
    lastSeenAt: Date | string | null;
    currentMaterialId: string | null;
};

export type QueueProcessingDependencies = {
    getPrinter(printerId: string): Promise<QueueProcessingPrinter | null>;
    findNextOrder(
        printerId: string,
        materialId: string
    ): Promise<{ id: string; materialId: string } | null>;
    startOrder(
        orderId: string,
        printerId: string
    ): Promise<{ success: boolean; error?: string }>;
};

type QueueProcessingOptions = {
    now?: () => Date;
    heartbeatTimeoutSeconds?: number;
};

/**
 * Find the best printer for an order
 * Returns the top-scoring printer or null if none available
 */
export async function findBestPrinter(orderId: string): Promise<PrinterScore | null> {
    const result = await printerMatchingService.findByOrderId(orderId);

    if (!result.success) {
        console.warn(`[PrinterMatching] ${result.error} for order ${orderId}`);
        return null;
    }

    console.log(
        `[PrinterMatching] Selected ${result.bestPrinter.printerName} for order ${orderId} ` +
        `from ${result.availablePrinters} eligible printers (${result.bestPrinter.score.toFixed(1)})`
    );

    return result.bestPrinter;
}

/**
 * Assign an order to a printer
 * Updates the order's printerId and status based on printer readiness
 */
export async function assignOrderToPrinter(orderId: string): Promise<{
    success: boolean;
    printerId?: string;
    status?: string;
    message: string;
}> {
    const bestPrinter = await findBestPrinter(orderId);

    if (!bestPrinter) {
        return {
            success: false,
            message: "No compatible printer found",
        };
    }

    // Determine new status based on whether we can print immediately
    const newStatus = bestPrinter.canPrintImmediately ? "PRINTING" : "IN_QUEUE";

    // Update order
    await prisma.order.update({
        where: { id: orderId },
        data: {
            printerId: bestPrinter.printerId,
            providerId: bestPrinter.providerId,
            status: newStatus,
            queuePosition: bestPrinter.breakdown.queueTimeMinutes > 0 ? null : 1,
        },
    });

    // If printing immediately, trigger OctoPrint
    if (newStatus === "PRINTING") {
        console.log(
            `[PrinterMatching] Starting print on ${bestPrinter.printerName} for order ${orderId}`
        );

        // Try to start print via OctoPrint
        const printResult = await startOrderPrint(orderId, bestPrinter.printerId);
        if (!printResult.success) {
            console.warn(
                `[PrinterMatching] Auto-start failed: ${printResult.error}. Order queued instead.`
            );
            // Update status to IN_QUEUE if auto-start failed
            await prisma.order.update({
                where: { id: orderId },
                data: { status: "IN_QUEUE" },
            });
        }
    }

    return {
        success: true,
        printerId: bestPrinter.printerId,
        status: newStatus,
        message: `Assigned to ${bestPrinter.printerName} (${newStatus})`,
    };
}

/**
 * Check queue for orders that can now be printed
 * Called when a printer becomes ready (isAcceptingOrders = true)
 */
export async function processQueueForPrinter(printerId: string): Promise<{
    processed: number;
    started: number;
}> {
    const config = await loadMatchingConfig();

    return processQueueForPrinterWithDependencies(
        printerId,
        {
            getPrinter: (id) => prisma.printer.findUnique({
                where: { id },
                select: {
                    id: true,
                    currentMaterialId: true,
                    isAcceptingOrders: true,
                    status: true,
                    lastSeenAt: true,
                },
            }),
            findNextOrder: (id, materialId) => prisma.order.findFirst({
                where: {
                    printerId: id,
                    status: "IN_QUEUE",
                    materialId,
                },
                orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
                select: { id: true, materialId: true },
            }),
            startOrder: startOrderPrint,
        },
        { heartbeatTimeoutSeconds: config.heartbeatTimeoutSeconds }
    );
}

export async function processQueueForPrinterWithDependencies(
    printerId: string,
    dependencies: QueueProcessingDependencies,
    options: QueueProcessingOptions = {}
): Promise<{ processed: number; started: number }> {
    const nowFactory = options.now ?? (() => new Date());
    const timeoutSeconds = options.heartbeatTimeoutSeconds ?? 120;
    const printer = await dependencies.getPrinter(printerId);

    if (
        !printer ||
        getPrinterStartBlockReason(printer, nowFactory(), timeoutSeconds) ||
        !printer.currentMaterialId
    ) {
        return { processed: 0, started: 0 };
    }

    const order = await dependencies.findNextOrder(
        printerId,
        printer.currentMaterialId
    );
    if (!order || order.materialId !== printer.currentMaterialId) {
        return { processed: 0, started: 0 };
    }

    // State may change while the queue candidate is being loaded.
    const latestPrinter = await dependencies.getPrinter(printerId);
    if (
        !latestPrinter ||
        latestPrinter.currentMaterialId !== order.materialId ||
        getPrinterStartBlockReason(latestPrinter, nowFactory(), timeoutSeconds)
    ) {
        return { processed: 1, started: 0 };
    }

    const printResult = await dependencies.startOrder(order.id, printerId);
    if (!printResult.success) {
        console.warn(
            `[PrinterMatching] Failed to start order ${order.id}: ${printResult.error}`
        );
        return { processed: 1, started: 0 };
    }

    console.log(
        `[PrinterMatching] Started queued order ${order.id} on printer ${printerId}`
    );
    return { processed: 1, started: 1 };
}
