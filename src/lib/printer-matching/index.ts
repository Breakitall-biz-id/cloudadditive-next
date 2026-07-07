/**
 * Printer Matching Algorithm
 * Finds the best printer for an order based on distance, queue time, and material
 */

import { prisma } from "@/lib/prisma";
import { calculatePrinterScore, sortByScore } from "./scoring";
import { startOrderPrint } from "@/lib/octoprint";
import type {
    PrinterCandidate,
    OrderForMatching,
    PrinterScore,
    MatchingWeights,
} from "./types";
export { DEFAULT_WEIGHTS } from "./types";
export type { PrinterScore, MatchingWeights } from "./types";

/**
 * Find the best printer for an order
 * Returns the top-scoring printer or null if none available
 */
export async function findBestPrinter(
    orderId: string,
    weights?: MatchingWeights
): Promise<PrinterScore | null> {
    // 1. Fetch order details
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            materialId: true,
            modelWidth: true,
            modelHeight: true,
            modelDepth: true,
            shippingLat: true,
            shippingLng: true,
            estimatedPrintTime: true,
        },
    });

    if (!order) {
        console.error(`[PrinterMatching] Order not found: ${orderId}`);
        return null;
    }

    const printers = await prisma.printer.findMany({
        where: {
            materials: {
                some: { materialId: order.materialId },
            },
            ...(order.modelWidth && { buildWidth: { gte: order.modelWidth } }),
            ...(order.modelDepth && { buildDepth: { gte: order.modelDepth } }),
            ...(order.modelHeight && { buildHeight: { gte: order.modelHeight } }),
        },
        select: {
            id: true,
            providerId: true,
            name: true,
            buildWidth: true,
            buildDepth: true,
            buildHeight: true,
            currentMaterialId: true,
            isAcceptingOrders: true,
            preprocessingTime: true,
            status: true,
            provider: {
                select: {
                    latitude: true,
                    longitude: true,
                    city: true,
                },
            },
            orders: {
                where: {
                    status: { in: ["IN_QUEUE", "PRINTING", "SLICING"] },
                },
                select: {
                    id: true,
                    status: true,
                    estimatedPrintTime: true,
                },
            },
        },
    });

    if (printers.length === 0) {
        console.warn(`[PrinterMatching] No compatible printers for order ${orderId}`);
        return null;
    }

    // 3. Score each printer
    const orderForMatching: OrderForMatching = {
        id: order.id,
        materialId: order.materialId,
        modelWidth: order.modelWidth,
        modelHeight: order.modelHeight,
        modelDepth: order.modelDepth,
        shippingLat: order.shippingLat,
        shippingLng: order.shippingLng,
        estimatedPrintTime: order.estimatedPrintTime,
    };

    const scores = printers.map((printer) =>
        calculatePrinterScore(printer as PrinterCandidate, orderForMatching, weights)
    );

    // 4. Sort by score and return best match
    const sorted = sortByScore(scores);

    console.log(
        `[PrinterMatching] Scored ${sorted.length} printers for order ${orderId}:`,
        sorted.map((s) => `${s.printerName}: ${s.score.toFixed(1)}`)
    );

    return sorted[0] || null;
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
    const printer = await prisma.printer.findUnique({
        where: { id: printerId },
        select: {
            id: true,
            currentMaterialId: true,
            isAcceptingOrders: true,
            status: true,
        },
    });

    if (!printer || !printer.isAcceptingOrders) {
        return { processed: 0, started: 0 };
    }

    // Find queued orders for this printer that match current material
    const queuedOrders = await prisma.order.findMany({
        where: {
            printerId: printerId,
            status: "IN_QUEUE",
            materialId: printer.currentMaterialId || undefined,
        },
        orderBy: { createdAt: "asc" },
        take: 1, // Process one at a time
    });

    let started = 0;

    for (const order of queuedOrders) {
        if (printer.status === "ONLINE") {
            // Try to start print via OctoPrint
            const printResult = await startOrderPrint(order.id, printerId);

            if (printResult.success) {
                started++;
                console.log(
                    `[PrinterMatching] Started queued order ${order.id} on printer ${printerId}`
                );
            } else {
                console.warn(
                    `[PrinterMatching] Failed to start order ${order.id}: ${printResult.error}`
                );
            }
            break; // Only start one at a time
        }
    }

    return { processed: queuedOrders.length, started };
}
