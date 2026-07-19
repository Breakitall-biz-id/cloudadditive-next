/**
 * Queue time calculation utilities
 */

import type { PrinterCandidate } from "./types";
import { isActiveQueueStatus, projectQueue } from "./projection";

const LEGACY_FALLBACK_MINUTES = 60;

/**
 * Calculate total queue time for a printer in minutes
 * Includes estimated print time + preprocessing time for each queued order
 */
export function calculateQueueTime(
    printer: PrinterCandidate,
    fallbackMinutes = LEGACY_FALLBACK_MINUTES
): number {
    return projectQueue({
        orders: printer.orders,
        preprocessingTime: printer.preprocessingTime ?? 10,
        fallbackMinutes,
    }).waitMinutes;
}

/**
 * Get queue position (1-indexed)
 */
export function getQueuePosition(printer: PrinterCandidate): number {
    return (
        printer.orders.filter((order) => isActiveQueueStatus(order.status))
            .length + 1
    );
}
