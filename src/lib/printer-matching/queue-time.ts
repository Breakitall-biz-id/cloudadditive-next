/**
 * Queue time calculation utilities
 */

import type { PrinterCandidate } from "./types";

const QUEUE_STATUSES = ["IN_QUEUE", "PRINTING", "SLICING"];

/**
 * Calculate total queue time for a printer in minutes
 * Includes estimated print time + preprocessing time for each queued order
 */
export function calculateQueueTime(printer: PrinterCandidate): number {
    const queuedOrders = printer.orders.filter((order) =>
        QUEUE_STATUSES.includes(order.status)
    );

    return queuedOrders.reduce((total, order) => {
        const printTime = order.estimatedPrintTime || 0;
        const preprocessTime = printer.preprocessingTime || 10;
        return total + printTime + preprocessTime;
    }, 0);
}

/**
 * Get queue position (1-indexed)
 */
export function getQueuePosition(printer: PrinterCandidate): number {
    return (
        printer.orders.filter((order) => QUEUE_STATUSES.includes(order.status))
            .length + 1
    );
}
