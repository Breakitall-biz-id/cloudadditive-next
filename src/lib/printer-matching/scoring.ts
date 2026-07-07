/**
 * Printer scoring algorithm
 * Calculates a score for each printer based on distance, queue time, and material match
 */

import { haversineDistance } from "./distance";
import { calculateQueueTime } from "./queue-time";
import {
    DEFAULT_WEIGHTS,
    type PrinterCandidate,
    type OrderForMatching,
    type PrinterScore,
    type MatchingWeights,
} from "./types";

/**
 * Calculate score for a single printer
 * Higher score = better match
 */
export function calculatePrinterScore(
    printer: PrinterCandidate,
    order: OrderForMatching,
    weights: MatchingWeights = DEFAULT_WEIGHTS
): PrinterScore {
    // 1. Distance Score (0-100, higher is closer)
    let distanceKm = 0;
    let distanceScore = 100; // Default if no coordinates

    if (
        printer.provider.latitude &&
        printer.provider.longitude &&
        order.shippingLat &&
        order.shippingLng
    ) {
        distanceKm = haversineDistance(
            order.shippingLat,
            order.shippingLng,
            printer.provider.latitude,
            printer.provider.longitude
        );
        // 1km = -1 point, max 100km penalty
        distanceScore = Math.max(0, 100 - distanceKm);
    }

    // 2. Queue Time Score (0-100, higher is faster)
    const queueTimeMinutes = calculateQueueTime(printer);
    const queueTimeHours = queueTimeMinutes / 60;
    // 1 hour = -20 points, so 5 hours = 0 points
    const queueTimeScore = Math.max(0, 100 - queueTimeHours * 20);

    // 3. Material Match Score (0 or 50, bonus for immediate printing)
    const materialMatch = printer.currentMaterialId === order.materialId;
    const materialMatchScore = materialMatch ? 50 : 0;

    // Calculate weighted total score
    const score =
        distanceScore * weights.distance +
        queueTimeScore * weights.queueTime +
        materialMatchScore * weights.materialMatch;

    // Can print immediately if material matches AND printer is ready
    const canPrintImmediately =
        materialMatch &&
        printer.isAcceptingOrders &&
        printer.status === "ONLINE";

    return {
        printerId: printer.id,
        providerId: printer.providerId,
        printerName: printer.name,
        score,
        canPrintImmediately,
        breakdown: {
            distanceScore,
            distanceKm,
            queueTimeScore,
            queueTimeMinutes,
            materialMatchScore,
            materialMatch,
        },
    };
}

/**
 * Sort printers by score (descending)
 */
export function sortByScore(scores: PrinterScore[]): PrinterScore[] {
    return [...scores].sort((a, b) => b.score - a.score);
}
